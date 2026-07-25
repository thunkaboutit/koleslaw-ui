---
title: The quantization that didn't fit
description: Nemotron's hidden dimension is 2688, which is not divisible by 256. That one fact quietly inflated a 4-bit quant by 40% and cost a weekend.
date: 2026-08-01
series: Cutting a 30B model's hosting bill
part: 1
tags: [quantization, gguf, llama.cpp, gpu]
draft: true
---

> Working draft. Structure and facts are in place, prose is not final.

## The setup

Serving a 31.6B MoE on a g6e.xlarge at $1.861/hr works out to about $1,360/mo.
The obvious lever is quantization: drop from Q8_0 to a 4-bit quant, fit a
smaller card, pay less.

## What went wrong

`Q4_K_M` produced a 24.5GB file. The target card has 24GB of VRAM.

K-quants operate on 256-element superblocks. Nemotron's hidden dimension is
2688:

```text
2688 / 256 = 10.5
```

Not an integer. When a tensor's dimension isn't divisible by the superblock
size, llama.cpp silently falls back to `q5_0` for that tensor rather than
failing. Enough tensors fall back and the "4-bit" quant lands closer to five
and a half bits.

There is no warning. The file just comes out too big.

## What works

32-element block types divide 2688 cleanly:

| Quant  | Block size | Size   | Fits 24GB |
| ------ | ---------- | ------ | --------- |
| Q4_K_M | 256        | 24.5GB | no        |
| IQ4_NL | 32         | 17.4GB | yes       |
| Q4_1   | 32         | 19.0GB | yes       |

`IQ4_NL` shipped at 4.61 bits per weight.

## Did it get worse?

Judged against the Q8_0 baseline, n=30, judge was claude-opus-4-8:

- Composite score: 4.70 quantized vs 4.69 full precision
- Blind pairwise: 16:14 in favour of the quant, 0 ties

Within noise. No measurable quality loss.

## The other landmine

CPU inference via `llama-cli` hangs outright on `nemotron_h_moe`. Don't
smoke-test that way. The integrity check that actually works is letting
`ollama create` hash the file.

## Result

g6e.xlarge at $1.861/hr became g6.xlarge at $0.8048/hr. About $770/mo saved,
and the model got faster: roughly 12 to 15 seconds mean latency, down from 21.

Next in this series: the same box, on spot, and the four hours it spent
serving nothing.
