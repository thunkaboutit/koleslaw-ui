---
title: My "4-bit" quant was 6.2 bits per weight
description: Nemotron's hidden dimension is 2688, which is not divisible by 256. That one fact quietly inflated a 4-bit quant by a third and cost a weekend.
date: 2026-08-01
series: Cutting a 30B model's hosting bill
part: 1
tags: [ quantization, gguf, llama.cpp, gpu, koleslaw ]
draft: true
---

> Working draft. Prose is a full candidate for review. Title DECIDED
> (cp 2026-07-29): "My "4-bit" quant was 6.2 bits per weight" doubles
> as the HN title (supersedes "The quantization that didn't fit",
> which the slug keeps per outline §2.7). (Eval-harness link is LIVE:
> the companion repo flipped public 2026-07-28, anon-verified.)
> Remove this note.

The GPU bill was $1,360 a month. That bought one graphics card in AWS, serving one model for a pet project you have
probably never heard of: the 31.6B parameter fine-tune behind [Koleslaw](https://koleslaw.ai), a prompt enhancer that
turns a rough prompt into a structured one. I built it specifically to share the build. This series is the write-up,
that exact model is public on
[Hugging Face](https://huggingface.co/thunkaboutit/Koleslaw-Nemotron-30B-A3B-PromptEnhance), and every claim in this
post is checkable.

The model file was 33.6 GB, too big for the cheap 24 GB tier of cards, so it lived one tier up, and that tier is priced
like it knows you have no alternative.

Quantization is the obvious lever. Store the model's numbers in fewer bits and the file shrinks, fits a smaller card,
and costs less to serve. It is a well-worn path that people walk every day without incident.

My 4-bit quant came out at 24.5 GB. That is not a 4-bit size. It did not fit the card, the tool exited clean, and
finding out why ate a weekend. One line of arithmetic against the model's config file would have predicted the whole
thing.

## The setup

Two AWS instances matter here:

| Instance   | GPU  | VRAM  | On-demand  | Per month |
|------------|------|-------|------------|-----------|
| g6e.xlarge | L40S | 48 GB | $1.861/hr  | ~$1,360   |
| g6.xlarge  | L4   | 24 GB | $0.8048/hr | ~$588     |

24 GB is the line that matters because it is where the commodity GPU tier ends. Crossing it more than doubles the price,
and my model sat on the wrong side for exactly one reason: the near-lossless Q8_0 file is 33.6 GB. The whole model has
to fit in the GPU's own memory, the VRAM column above, before the first token comes out. Run out and it simply does not
load.

The budget for the smaller card is one line:

`weights + context cache + runtime overhead <= 24 GB`

A true 4-bit quant of 31.6B parameters is ~18 GB of weights, which leaves a comfortable 5 to 6 GB for context and
overhead. The headroom is not optional, because this model thinks before it answers: it writes hidden reasoning tokens
ahead of the visible ones, and those tokens live in the context window, which lives in VRAM. It is also a mixture of
experts, which will matter for speed later but not for memory: all 31.6 billion parameters sit in VRAM even though each
token only runs through about 3 billion of them.

If you want to follow along: the
[model repo](https://huggingface.co/thunkaboutit/Koleslaw-Nemotron-30B-A3B-PromptEnhance)
has the f16, the Q8_0, and both 4-bit quants. Toolchain was Ollama v0.32.0 and llama.cpp at commit `c96f608`. The
architecture is young enough that the pin matters.

## What went wrong

The command was ordinary. Q4_K_M is the usual default recommendation: the number is the bits, the letters are the
packaging.

```text
llama-quantize --allow-requantize <q8>.gguf <out>.gguf Q4_K_M 16
```

The expectation was ordinary too:

`31.6B params × ~4.5 bits / 8 ≈ 18 GB`

The file came out at 24.5 GB, which is 22.8 GiB. In fairness, the tool does warn: one line per affected tensor,
scrolling past with the hundreds of other per-tensor lines, plus a one-line count at the very end. What it never does is
fail. If you were not reading the scroll, the first thing you notice is the file size. Exit code 0 and a file a third
bigger than ordered.

> **Side note:** GB and GiB are different units. A gigabyte (GB) is a
> round billion bytes. A gibibyte (GiB) is 2^30 bytes, about 7% more.
> Disk tools tend to report GB and memory tools GiB, so when the question
> is "does this file fit in that memory," convert first. This post shows
> both.

The target card offers 24 GB, and between the driver and the runtime you do not get all of it. Weights at 22.8 GiB leave
a few hundred megabytes for a context cache that wants gigabytes. A thinking model with no room to think.

The mechanism, in the order I should have checked it:

1. Q4_K_M is a K-quant. K-quants pack weights in superblocks of 256.
2. This model's hidden dimension is 2688.
3. 2688 / 256 = 10.5. Not an integer.
4. llama.cpp does not fail on a tensor it cannot K-quant. It warns, substitutes `q5_0` for that tensor, and moves on.
5. Enough tensors fall back and the "4-bit" file lands at ~6.2 bits per weight.

The hidden dimension is the row length that most of the model's big matrices share, so a width shared everywhere means a
problem shared everywhere.

Here is the log of exactly that run. Same Q8_0, same command, same pin:

```text
llama_model_quantize_impl : tensor cols 2688 x 10304 are not divisible by 256, required for q4_K - using fallback quantization q5_0
...
llama_model_quantize_impl: model size  = 32022.09 MiB (8.51 BPW)
llama_model_quantize_impl: quant size  = 23371.92 MiB (6.21 BPW)
llama_model_quantize_impl: WARNING: 134 of 164 tensor(s) required fallback quantization
```

134 of 164. Here is where they went, grouped from the log and the file header:

| Tensors                | Row width   | ÷256 | Intended   | Written    | Count |
|------------------------|-------------|------|------------|------------|-------|
| attn_q, attn_k, attn_v | 2688        | no   | q4_K, q6_K | q5_0, q8_0 | 18    |
| attn_output            | 4096        | yes  | q4_K       | q4_K       | 6     |
| ssm_in (Mamba)         | 2688        | no   | q4_K       | q5_0       | 23    |
| ssm_out (Mamba)        | 4096        | yes  | q4_K       | q4_K       | 23    |
| expert FFN up          | 2688        | no   | q4_K       | q5_0       | 46    |
| expert FFN down        | 1856 / 3712 | no   | q4_K, q6_K | q5_0, q8_0 | 46    |
| token embedding        | 2688        | no   | q4_K       | q5_0       | 1     |

The pattern is exact. Both tensor groups that are 4096 wide kept their intended type, because 4096 divides by 256.
Everything built on the 2688 hidden dimension fell back, and the expert FFN widths of 1856 and 3712 fell with it. The
rule is the division and nothing else.

For contrast, the shipped IQ4_NL has no split to show: 159 of those same tensors wrote as `iq4_nl`, and the four it
wanted at higher precision landed on q5_1, another 32-block type. Nothing ballooned.

Here is the check that would have saved the weekend. Run it against any model's `config.json` before you pick a quant
type:

```python
import json

cfg = json.load(open("config.json"))
for key in ("hidden_size", "intermediate_size", "moe_intermediate_size"):
    if key in cfg:
        ok = cfg[key] % 256 == 0
        print(key, cfg[key], "OK" if ok else "falls back in K-quants")
```

For this model, `hidden_size` comes back 2688 and the check fails. The whole weekend, available in advance, for free.

## What works

The fix is quant types that pack weights in blocks of 32 instead of 256. 2688 / 32 = 84, an integer this time.

The 32-block family: IQ4_NL, Q4_1, Q4_0, Q5_0, Q5_1, Q8_0.

| Quant  | Block size | File size          | Bits per weight | Fits 24 GB |
|--------|------------|--------------------|-----------------|------------|
| Q4_K_M | 256        | 24.5 GB (22.8 GiB) | 6.21            | no         |
| IQ4_NL | 32         | 18.2 GB (17.0 GiB) | 4.61            | yes        |
| Q4_1   | 32         | 19.9 GB (18.6 GiB) | ~5.0            | yes        |

IQ4_NL won on size and on how it spends its bits. Model weights cluster near zero, so a plain linear 4-bit grid wastes
codes on values that barely occur. IQ4_NL's grid is non-linear, denser where the weights actually live. Q4_1 sat in
reserve as the boring backup.

The recipe that shipped, produced under the same pinned llama.cpp (newer builds are not guaranteed for this
architecture):

```text
llama-quantize --allow-requantize <q8>.gguf <out>.gguf IQ4_NL 16
```

In production the shipped file serves with context loaded at 17.6 GB used of the card's 24, as reported by the serving
runtime. The fit problem was over.

Two shortcuts to disclose: the shipped file was requantized from the Q8_0 rather than the f16 original, and no
importance matrix was used. Requantizing stacks rounding on rounding, and skipping the imatrix leaves I-quant quality on
the table, so both should cost something. Whether they cost anything that matters is exactly what the next section
measures.

## Did it get worse?

The method first, so you can rerun it instead of trusting me:

- 70 prompt pairs from the fine-tune's held-out validation set.
- Latency measured across all 70, on the target L4.
- Quality judged on a 30-item subset by claude-opus-4-8. Each output scored 1 to 5 on clarity, completeness, and
  faithfulness. Then a blind pairwise pick per item, A/B order randomized, ties allowed.

| Metric                 | Q8_0 (baseline) | IQ4_NL (shipped) |
|------------------------|-----------------|------------------|
| Judge composite (n=30) | 4.69            | 4.70             |
| Blind pairwise wins    | 14              | 16               |

Zero ties occurred, though ties were allowed. A 16:14 split is a coin flip, and that is the point. Latency for the quant
across the full 70:
14.5s mean, 19.8s p95, on the L4. The Q8_0 it replaced averaged ~21s in production on its L40S. Different cards, so
treat that pair as before and after, not as a controlled comparison.

The supportable claim is "indistinguishable" and nothing stronger. n=30 is a ship gate, not a benchmark. I would not put
these numbers in a paper. I did bet the production cutover on them, and the bet has held since.

One bias note: both sides of the blind pairwise are the same model at two precisions, so whatever stylistic
self-preference the judge carries cancels out. The pairwise is the strong leg of this eval. The composite, scored
against a reference, is the weaker one.

The judge prompt, minus the template plumbing that pastes in the three texts:

```text
You are evaluating the quality of an AI-enhanced prompt. You will see:
1. The original raw user prompt
2. A ground-truth enhanced version (produced by a frontier model)
3. A candidate enhanced version (produced by the model being evaluated)

Rate the candidate on three dimensions (1-5 scale):

Clarity (1-5): Is the enhanced prompt unambiguous and easy to understand?
Completeness (1-5): Does it add useful specificity, constraints, structure,
and context?
Faithfulness (1-5): Does it preserve the original user's intent?

Respond with ONLY a JSON object (no other text):
{"clarity": <1-5>, "completeness": <1-5>, "faithfulness": <1-5>}
```

The
[harness around it](https://github.com/thunkaboutit/koleslaw-ops-spot-watchdog/blob/main/scripts/quant-ab-eval.py) is
~430 lines of Python: generate with both models, score against the reference, randomize the pairwise order, tally. The
Q8_0 and the IQ4_NL are both public, so rerunning the whole thing costs a few dollars of judge API credit and an
afternoon.

## The other trap

There is a second, unrelated way this architecture wastes your time. CPU inference with `llama-cli` hangs outright on
`nemotron_h_moe`. No error, no crash, no output. The obvious quick sanity check on a laptop before uploading 18 GB is
the one thing you cannot do.

The integrity check that works: let `ollama create` import the file. It hashes the whole thing on the way in, so
corruption fails loudly there. Then test for real on a GPU.

Both problems in this post are per-model, not per-family. I checked Nemotron-3-Ultra-550B: it is `nemotron_h` rather
than `nemotron_h_moe`, and every dimension divides by 256. Neither issue applies to it. Check dims, not brand names.

## The result

\$1.861 an hour became \$0.8048. About \$770 a month back, and the product got faster at the same time. Enhances that
averaged ~21s on the Q8_0 and its L40S now run 12 to 15s mean on the IQ4_NL and its L4.

Cheaper and faster sounds like a sales slide, so here is the physics. Generating tokens is bound by memory bandwidth,
not arithmetic. For every token, the GPU reads the weights it needs out of VRAM. Cut the bytes per weight and you cut
the reading per token. Most of the speedup is that.

If you take one thing from this post: divide the hidden dimension by 256 before you trust a K-quant. It costs nothing
and it is the difference between a file that fits and a weekend.

The bill is now \$588 a month. The next post cuts it to \$245 with spot instances: the same hardware at a 60% discount,
except AWS can take it back with two minutes of notice. The morning I learned what that actually means, my GPU fleet
spent four hours and thirty-seven minutes at zero.

> ## Reproduce this
>
> **You need:** a machine with llama.cpp built at commit `c96f608` and
> ~60 GB of free disk, or ~80 GB if you also want the failure-mode Q4_K_M
> alongside the source. No GPU needed for the requant itself. A 24 GB
> card if you want to verify serving.
>
> **Artifacts:** the
> [model repo](https://huggingface.co/thunkaboutit/Koleslaw-Nemotron-30B-A3B-PromptEnhance)
> holds the f16, the Q8_0, and both 4-bit quants.
>
> **Steps:**
>
> 1. Run the `config.json` divisibility check above. Watch it fail on
>    `hidden_size` 2688.
> 2. Download the Q8_0 (33.6 GB).
> 3. `llama-quantize --allow-requantize <q8>.gguf <out>.gguf IQ4_NL 16`
> 4. Point a Modelfile at the output and let `ollama create` finish its
>    hash pass (Ollama v0.32.0 here).
> 5. Optional: rerun the A/B with the judge prompt above and your own API
>    key. The harness is `scripts/quant-ab-eval.py` in the
>    [companion repo](https://github.com/thunkaboutit/koleslaw-ops-spot-watchdog).
>
> **Expected output:** an 18.2 GB (17.0 GiB) file at 4.61 bits per weight
> and a clean hash pass. To see the failure mode instead, quantize to
> Q4_K_M and watch 134 of 164 tensors fall back and the file come out at
> 24.5 GB.
>
> **Total cost to reproduce:** $0 on hardware you own, or about an hour of
> a rented 24 GB GPU to verify serving.

## Receipts

- Instance prices are published AWS on-demand rates, us-east-2, July 2026. Monthly figures are hourly × 730.
- File sizes are measured from the artifacts. Decimal GB first, GiB in parentheses.
- Bits per weight is arithmetic: file bytes × 8 / 31.6B parameters.
- Quality numbers are one judged run, n=30, judge claude-opus-4-8, method and prompt in the post. A non-regression gate,
  not a benchmark.
- Latency figures each name their card. 14.5s mean / 19.8s p95: the full 70-prompt run, IQ4_NL on an L4.  ~21s:
  production average, Q8_0 on an L40S. 12 to 15s: post-cutover production sample, IQ4_NL on the L4.
- The 17.6 GB in-production memory figure is the serving runtime's own report.
- The fallback behavior is readable in llama.cpp source at the pin (`src/llama-quant.cpp`, commit `c96f608`): a
  per-tensor warning, a
  `q5_0` substitution for `q4_K`, and an end-of-run count of fallback tensors.
- The Q4_K_M log excerpt and the histogram come from running the exact command shown, against the same Q8_0, under the
  same pin: output 24,515,129,664 bytes, 6.21 BPW by the tool's own summary, 134 of 164 tensors fallen back.
  Quantization under a pinned build is deterministic. Run it and you get this log.
