---
title: AWS reclaimed my only GPU seven times in 21 hours
description: Spot can take the box behind the product with two minutes of notice. Seven reclaims in 21 hours proved out the six design decisions that make that boring.
date: 2026-08-15
tags: [ aws, spot, gpu, resilience, koleslaw ]
draft: true
---

> Working draft.  Second pass: cp review round 1 applied 2026-07-28.
> Open before publish: (1) Title DECIDED (cp 2026-07-29): "AWS
> reclaimed my only GPU seven times in 21 hours" doubles as the HN
> title (supersedes "Seven reclaims in 21 hours", cp 2026-07-28).
> Slug deliberately stays designing-for-the-gpu-being-gone: the URL
> keeps the search phrase the title gave up (outline §2.7).  (2) Re-verify "Capacity is one"
> and the drain-row stream figure right before publish: tracker 0.17
> (pre-launch concurrency readiness: queue shaping, possibly parallel
> slots) may change "one at a time" and the overflow mechanics.  This
> draft describes the deployment as of 2026-07-28.  (3) Optional
> gather: a verbatim pre-fix 524 artifact from 2026-07-14, if anything
> survives.  The post states the symptom without one and the receipts
> say so.  (4) Umbrella tag is `koleslaw`, CONFIRMED by cp 2026-07-28
> (the two prior names struck same day; ruling in outline §1.2; swept
> across all three posts).  (5) Remove this note.

In the 21 hours after spot went back on, AWS took the GPU behind [Koleslaw](https://koleslaw.ai) seven times.  The
fleet is one instance.  Seven times, a fresh box booted, restored an ~18 GB model cache from S3, loaded it into VRAM,
and was serving again under five minutes after its kernel started.  Users spent those minutes getting answers from a
cloud fallback.  One alarm fired.  It lasted two minutes and resolved itself.  I read about all of this afterward, in
the logs.

That churn is the deal I signed.  [Post 2](/blog/running-a-30b-model-on-spot-gpus) cut the GPU bill 60% by moving to
spot, where AWS can reclaim the instance with two minutes of notice.  Post 2 was about the supervisor that arms and
disarms that bet.  This post is about the layer underneath: what happens to a user's request while the GPU is gone.

When a two-minute warning is a normal Tuesday, degraded stops being an incident state.  It becomes a product state.
Product states get designed.  Here are the six decisions, in the order they explain each other.

## Capacity is one

The deployment takes one enhance at a time.  One box, one card, one request in flight.  An enhance runs 12 to 15
seconds on the L4, so the arithmetic is short:

`60s / ~14s per enhance ≈ 4.3 requests per minute`

That is not per instance.  That is the product.  Every capacity decision downstream is sized from this division:

| Tier      | Cap            |
|-----------|----------------|
| Anonymous | 10/day per IP  |
| Free key  | 50/day per key |
| Pro key   | 500/day per key |

The reframe that makes a 4.3-per-minute product survivable in public: a traffic spike cannot crash the GPU.  Requests
the box cannot take spill to the cloud fallback, and the fallback is metered per token.  A traffic problem arrives as
a billing problem.  Which means the rate limits above are not abuse design.  They are cost design.  They put a ceiling
on what a bad day can invoice.

## The fallback is availability-only, and it is asymmetric

Post 2 said every degraded window was absorbed by a fallback that took real design work.  Most of that work was
deciding when the fallback must NOT fire.

The rule: the fallback engages only on errors that mean "the backend serving this model is unreachable or not serving
it right now."  In [the API's error taxonomy](https://github.com/thunkaboutit/koleslaw-api/blob/22ea1a4/src/koleslaw_api/services/llm.py),
that is `Timeout`, `APIConnectionError`, `ServiceUnavailableError`, `InternalServerError`, and `NotFoundError`.
Errors that would fail identically anywhere stay visible: bad auth, a malformed request, a rate limit.  Retrying those
on a second model answers a question nobody asked.

`NotFoundError` earns its place on the list, and the reasoning is the kind of thing that only looks obvious after you
write it down.  A GPU replacement that has not finished registering its model answers 404.  That 404 says nothing
about whether a cloud model can take the request.  So a 404 from the local tier is an availability signal.  That same
generosity had a security consequence once the model name became caller-supplied, and that story is the next post.

Two asymmetries are deliberate:

- The server may use a cloud model.  A caller may not.  The `model` parameter is checked against an exact-match
  allowlist, and `/v1/models` lists only what a caller can pick.  Cloud models are server-internal.
- The fallback does not chain.  It engages only when the primary is the local tier.  A cloud model failing is not a
  problem another cloud model is likely to dodge, and its errors should stay visible.

One more edge, from the streaming path: the fallback engages only before the first byte reaches the client.  A stream
that dies mid-flight cannot be retried without duplicating output, so it propagates as a broken stream.  Game day
counted exactly one of those across ~980 requests, the one caught mid-flight by a deliberate terminate.

Now the honest tax.  This product has two sources of truth for its system prompt.  The local model's SYSTEM lives in
the Ollama Modelfile, next to the weights, and the API deliberately sends no system message so the Modelfile applies.
The cloud fallback has no Modelfile, so the API keeps per-type prompts for it.  Two places to edit, one product
voice to keep consistent.  What would retire the debt is one template rendered into both places at build time.  It
has not been done because the Modelfile ships with the weights and the API ships on its own train, and coupling two
release trains to deduplicate a prompt has so far cost more than the duplication.  So far.

## Health checks that lie

Confession first: the API's `/v1/health` returns 200 while degraded.  The load balancer in front of it cannot see "up
but broken."  That one is known, accepted, and watched from the side by an alarm on the thing that actually breaks,
the healthy-GPU-target count.  Not every lie needs fixing.  This one is cheap and monitored around.

The GPU-side version of the lie was not cheap, and it got fixed.  A booting GPU box passes a TCP health probe the
moment the server process listens.  The model is not in VRAM yet.  A request routed there does not fail, which would
be fine.  It queues behind a multi-minute VRAM load, which is worse than failing, because the fallback triggers on
errors and a hang is not an error until a timeout says so.

The fix is two lines of iptables in the bootstrap, from the
[companion repo](https://github.com/thunkaboutit/koleslaw-ops-spot-watchdog)'s ASG module:

```bash
iptables -I INPUT -p tcp --dport 11434 ! -i lo -j REJECT --reject-with tcp-reset

# ...install Ollama, restore the blob cache, load the model into VRAM...

iptables -D INPUT -p tcp --dport 11434 ! -i lo -j REJECT --reject-with tcp-reset
```

Three choices are doing the work.  `REJECT` with `tcp-reset`, not `DROP`: a blocked caller gets a reset now instead
of a timeout later, so the API falls back in seconds.  `! -i lo`: the gate blocks the world but not localhost, and
the bootstrap talks to Ollama over localhost to restore and warm the model behind it.  And the delete runs only after
the warm-up generate call returns, so the port opening asserts the model answers instantly, not that a process exists.

After the fix, NLB target health means "serves instantly."  The public end-to-end check is even simpler:
`GET /v1/models` on the API lists the served tag.  If the tag is there, every layer between the internet and the VRAM
is telling the truth.

The transferable sentence: make the health signal mean what the load balancer thinks it means.

## Zero-gap by default

Split every instance replacement into planned and unplanned, and treat them differently.

Planned replacements, model rolls included, are launch-before-terminate: the new box boots, restores, warms, passes
health checks, and only then does the old box drain.  The overlap runs 15 to 27 minutes observed, and the fleet
serves through all of it.  Post 2's game day pushed 601 live requests through one of these with zero errors.  A planned change has
no excuse for a serving gap, so the design gives it none.

Unplanned death is the window the product actually pays.  The dying box's side of it is fixed:

```text
T+0:00   AWS posts the interruption notice.  Two minutes on the clock.
T+0:05   the drain hook (a 5-second poll against instance metadata) sees
         it and deregisters the box from the NLB.  New requests stop
         routing here.  In-flight SSE streams run to completion: a stream
         lasts about one enhance, 12 to 15 seconds mean on the L4, so the
         notice outlives every stream it interrupts.  From this moment
         the API answers everything from the fallback.
T+2:00   the instance is gone.
```

The replacement's clock is separate, and where it starts is what sets the window.  Launch to serving runs ~5.5
minutes: ~1.5 minutes from launch to the first line of the bootstrap's log (EC2 provisioning, kernel, and
cloud-init, so the boot table's first stage lives inside this figure and is counted once), then ~4 minutes for the
remaining warm-boot stages (next section).  Traffic routes about a minute after that, once the NLB probes pass.
When capacity rebalancing pre-provisions a successor at the rebalance warning, usually from the other pool, that
clock starts a couple of minutes before the notice even posts, and the fallback window comes in under five minutes.
When the market has nothing at the warning, the launch waits for the reclaim, the same clock starts at T+2:00 at
the earliest, and the window runs eight and a half minutes, give or take.  The seventh reclaim shows how much later
than that the market can make it.

Post 2's failover threshold is 12 minutes precisely so that neither case looks like a drought: routine recovery, in
either flavor, must never trigger a failover.  Six of the seven July reclaims stayed under that line.  The seventh
did not, and it closes this post.

Two traps worth naming, both learned the hard way:

- Never reboot the GPU box.  The model cache lives on the instance store, which is ephemeral, and the bootstrap runs
  on first boot only.  A reboot comes back with an empty NVMe and no bootstrap to fill it.  Terminate and let the
  ASG replace.
- Pin the launch template's `latest_version` as a number.  With `$Latest`, a template change never registers as
  drift, and the instance refresh that should roll the fleet never triggers.

And a quota footnote that is really a design constraint: my spot quota is 8 vCPUs, and the xlarge boxes are 4 each.
Two boxes exactly.  That is precisely enough room for launch-before-terminate on a one-instance fleet.  The same
quota running one 2xlarge could never refresh at all.  Quota is part of the deploy design, not an ops detail.

## Recovery time is a design variable

The first unplanned GPU replacement this product ever did cost ~35 minutes.  The current median is 267 seconds,
kernel to serving.  The method was not clever: cache the expensive artifact, put it on the fast disk, instrument
every stage, measure.

The expensive artifact is not the download.  The only two cold boots on record, from the Q8 era when the model file
was 33.6 GB, put numbers on it:

| Stage                          | Boot 1 | Boot 2 |
|--------------------------------|--------|--------|
| model download, S3 to NVMe     | 144s   | 147s   |
| `ollama create` (import + hash) | 571s   | 569s   |
| model load to VRAM             | 128s   | 127s   |
| total, kernel to serving       | ~941s  | ~941s  |

The download runs ~230 MB/s.  The import runs ~9.5 minutes, and it produces the same blob store every time.  So the
bootstrap builds it once, uploads the built blob store to S3 keyed by the source artifacts' ETags, and every later
boot restores instead of importing.  The second cold boot above spent 71 extra seconds priming that cache, after it
was already serving, so the priming cost no downtime.  The first restore-boot ran 46 minutes after the design
shipped, which is the nice thing about caches keyed on content: they do not care why the last box died.

The warm path is the one that matters now, and it is measured, not estimated.  Every warm boot writes a `BOOTSTAGE`
line per stage to CloudWatch.  Across all 27 warm boots since the port gate existed:

| Stage                                | min | median | max |
|--------------------------------------|-----|--------|-----|
| kernel to user-data start            | 20s | 27s    | 47s |
| CloudWatch agent up                  | 30s | 40s    | 55s |
| Ollama install (pinned, from S3)     | 7s  | 11s    | 12s |
| blob cache restore, S3 to NVMe       | 83s | 101s   | 146s |
| model load to VRAM                   | 37s | 97s    | 113s |
| **kernel to serving**                | **229s** | **267s** | **355s** |

(Medians do not sum to the median total.  Two stages cost ~1 second and are omitted: arming the drain hook and
mounting the NVMe.  And a provenance note the table owes you: two of the 27 boots predate the quantization cutover
and moved the 33.6 GB Q8 blob instead of the ~18 GB q4 one.  Both are from July 16, and the 355-second worst case
is the incident-recovery boot from post 2.  They own the restore and serve-at maxima, and, as this section will
have to admit, both ends of the warm column.  The other 25 rows are the current model.)

The two model stages are ~200 of the 267 seconds.  Everything else is packaging.  And those two stages are bimodal:
the q4-era restore and warm times split into two clean clusters, ~84s + ~83s and ~101s + ~99s.  The clusters are
the two spot pools.  Instance types are only verifiable while an instance exists, and three boxes were checked
live: two g6.xlarge (L4) both landed in the fast cluster, one g5.xlarge (A10G) in the slow one.  The terminated
rows are inferred from their cluster.

If you have read post 2, that order looks backwards: there, the A10G is the fast card.  Both readings are right.
Inference is bound by VRAM bandwidth, where the A10G wins.  Loading is bound by the disk and the bus, and it never
touches VRAM bandwidth, so the card that answers faster is allowed to load slower.  I will label that a plausible
mechanism rather than a traced one.  What the table proves is only the split itself.

The Q8-era rows are the asterisk the table needs, and an honest one.  Both necessarily ran the 48 GB L40S, because
a 33.6 GB blob does not fit either 24 GB pool, and between them they own the warm column's two extremes.  One
loaded the model in 37 seconds, roughly 900 MB/s against the q4 clusters' ~200, the fastest load in the record.
The other took 113 seconds for the same file on the same card class.  (The two Q8 cold boots, L40S by the same
argument, warmed in 127 and 128.)  So the fastest number in the table is real, and it is an outlier I cannot
explain, not a card property.  All four numbers are true.  The one I would have quoted proudly is the one the rest
of the data argues with.  The 37-second box, for what it is worth, was the incident morning's spot g6e, and AWS
reclaimed it 20 minutes later.  Post 2 tells that one.

The last piece is boring on purpose.  Ollama is version-pinned and installs from a tarball mirrored in the same S3
bucket, an 11-second stage.  The serving-critical path pulls nothing from the public internet.  A boot that depends
on an upstream download is a boot that can fail at 3am, and this design's whole posture is that 3am belongs to the
machines.

## The 100-second wall

Cloudflare closes a proxied connection that stays silent for ~100 seconds, and the number is not configurable below
the Enterprise tier.  This product is built on a model that thinks before it answers.  The thinking phase emits no
visible tokens.  Slow request, silent connection, and at second 100 the user gets a 524 error page for the crime of
asking a hard question.  The worst requests failed at a wall the best requests never met, which made it look
intermittent, which made it annoying to diagnose.

The fix is that bytes must flow.  Two bytes-flow guarantees, from the
[streaming endpoint](https://github.com/thunkaboutit/koleslaw-api/blob/22ea1a4/src/koleslaw_api/routes/enhance.py): the
response's first byte, an SSE comment `: connected`, goes out immediately, before the model does anything, so the
proxy sees a live response even while the request waits behind a model load.  After that, a wrapper emits a comment
whenever the stream stalls:

```python
KEEPALIVE_SECONDS = 20.0
_KEEPALIVE = ": keepalive\n\n"

async def _with_keepalive(agen):
    """Yield from an async generator, emitting SSE comments during stalls."""
    next_task = None
    try:
        while True:
            if next_task is None:
                next_task = asyncio.ensure_future(anext(agen))
            done, _ = await asyncio.wait({next_task}, timeout=KEEPALIVE_SECONDS)
            if not done:
                yield _KEEPALIVE
                continue
            next_task = None
            try:
                yield done.pop().result()
            except StopAsyncIteration:
                return
    finally:
        if next_task is not None:
            next_task.cancel()
```

SSE comment lines are in the spec, so compliant parsers ignore them, and line-based parsers that only look for
`data:` prefixes skip them too.  The proxy sees traffic.  The user sees nothing until there is something to see.

The accepted limit, stated plainly: the non-streaming endpoint, `/v1/enhance/sync`, still has the 100-second
ceiling, because there is no stream to keep alive.  At 12 to 15 second enhances on the L4 it clears the wall by a
wide margin.  If latency ever grew by an order of magnitude, that endpoint would quietly stop working for the
slowest requests, and this paragraph is the reminder that the limit was accepted, not solved.

## Seven reclaims later

Back to the 21 hours from the cold open.  Spot came back on at 08:41 UTC on July 27, after the give-up-valve stretch
post 2 ends on.  The market was churny.  Eight boots in 21 hours: the re-arm swap, then seven reclaim replacements.
Every one restored warm and was serving in 235 to 296 seconds of uptime.  Zero failovers.  Zero human minutes.

Six of the seven never tripped the alarm, so their windows sat under the 12-minute line, and by the component math,
in the band.  Nothing to tell.  The seventh escaped the band, and it is the best receipt in the record.

In the small hours of July 28, the launch lost the race.  The market held the replacement back long enough that the
fleet sat without a healthy target from a little after 02:04 UTC, and the alarm's 12-minute evaluation window
started filling.  The box that finally came booted at 02:11 and ran a completely ordinary warm boot: serving at 246
seconds of uptime, a healthy target by about 02:16.  The boot was never the slow part.

At 02:20:04 the no-healthy-hosts alarm fired anyway.  Post 2 taught you what that alarm means: twelve unbroken
minutes without a healthy target.  Those minutes were real.  They had also already ended.  The alarm was reporting,
four minutes late, an outage the boot had just closed, and EventBridge invoked the watchdog to fail over a fleet
that was already fine.

The watchdog declined, logging one line:

```text
failover skipped: instance younger than grace is still warming
```

The line is more conservative than the truth.  The guard does not check whether the box is warming.  It checks the
one thing it can trust, the instance's age, ten minutes give or take against a 15-minute grace, and assumes
warming.  This time the box had been serving for the last five of those minutes.  The guard's caution and the alarm's lag
cancelled out, which is the polite way of saying the guard was right for a better reason than the one it logged.

Grace is a threshold post 2's table did not list, so here it is.  An instance younger than 15 minutes, the ASG's own
health-check grace period, is treated as a recovery in progress, and failover refuses to churn a booting box.  The
skip has its own escape hatch: once the alarm has been lit for 30 minutes it stops applying, because a reclaim churn
loop always has a young instance in it, and pinning on-demand is what fixes one of those.  Post 2's table held the
five thresholds that drive the state machine.  The
[companion repo](https://github.com/thunkaboutit/koleslaw-ops-spot-watchdog) holds all of them.

The alarm looks twelve minutes into the past.  The guard looks at the instance in front of it.  At 02:20 those two
views disagreed about the present, the guard's was closer, and at 02:22:04 the alarm's metrics caught up and it
went back to OK.  Two minutes of ALARM, zero actions taken, and the scanner that retries skipped failovers every
half hour found nothing left to retry.  Total human involvement: reading that log line the next morning.

Every essay above is one reason those 21 hours were boring.  The capacity math meant the fallback could absorb the
load.  The error taxonomy meant it fired exactly when it should.  The port gate meant no request queued behind a
warming box.  The drain hook meant streams finished before their instance died.  The measured boot meant six
reclaims never came near the threshold, and the seventh was judged by its instance's age, not by its alarm.  The
keepalives meant every slow answer crossed the proxy instead of dying at second 100.  Boring took design, and the
design took an incident apiece.

The next post is what a security review found before the API's code went public.  It opens with the fallback you
just read about, because the friendliest feature in this post was also the most expensive thing a stranger could
reach.

> ## Ask this of your own stack
>
> This post's version of the series' reproduce-this box is five questions instead of commands.  They are the five
> this architecture answers, and the answers were all measured, not designed on faith.
>
> 1. What is your actual concurrent capacity, as a number you could say out loud?
> 2. What exactly triggers your fallback, and can a 404 reach it?  Should it?
> 3. What does your load balancer's health check actually assert?  "A process listens" and "a request succeeds
>    instantly" are different claims.
> 4. Which boot artifact is expensive, and where is it cached?  What happens if the box dies while the cache is
>    cold?
> 5. What cuts your long-lived connections, and at what second?  Your proxy knows.  Do you?

## Receipts

- Boot timings come from `BOOTSTAGE` lines the bootstrap writes to CloudWatch, one per stage, using the instance's
  own uptime clock (log timestamps arrive agent-batched and reorder, uptime does not).  Pulled 2026-07-28: 36
  instrumented boots, of which 27 are warm boots in the port-gate era and form the table.  Medians are per-stage,
  so they do not sum to the median total.  Two of the 27 are Q8-era boots, called out inline.  The load-rate
  figures are file size over stage time, decimal GB.
- The ~1.5 minute provisioning lead is EC2 `LaunchTime` against the first user-data log line, observed on the live
  instance at pull time.
- The bimodal clusters are measured.  The instance-type attribution is anchored by three boxes type-verified
  against EC2 while they existed (two g6.xlarge, one g5.xlarge) and inferred by cluster for terminated ones.  The
  L40S numbers are four boots of the Q8-era blob, not a benchmark.
- The cold-boot table is the complete record: the only two cold boots that ever ran in production, Q8 era, 33.6 GB,
  2026-07-15.  The current q4 model has never cold-booted in production, because its cache was primed from staging
  before the cutover.
- The seven-reclaims churn, the 02:20 to 02:22 alarm, and the failover-skipped line are from the ASG activity
  history, the CloudWatch alarm history, and the watchdog Lambda's log for 2026-07-27 to 07-28.  The skip line is
  verbatim.
- The capacity arithmetic uses the 12 to 15 second production mean on the L4 (g6.xlarge), post 1's figure.  The
  one-at-a-time serialization was observed under game-day replay load.  The drain-timeline stream duration is the
  same figure, because a stream lasts about one enhance.  Latency numbers name their card throughout, per the
  series rule.
- The reclaim-window band is bounded by the alarm history, not stopwatched per reclaim.  Six of the seven reclaims
  never tripped the 12-minute no-healthy-target alarm, so their windows sat under it.  The seventh's window is
  derived from the alarm's arithmetic crossed with the boot's own `BOOTSTAGE` lines: the 02:11 boot was serving at
  246 seconds of uptime and healthy by about 02:16, and the alarm still fired at 02:20:04, so its twelve breaching
  minutes ended as the recovery landed, which puts the start of the outage near 02:04.  Call the window twelve
  minutes and change, reported about four minutes late.  Back to OK at 02:22:04.  The under-five and
  eight-and-a-half figures are the timeline's components summed per launch-timing case, not independent
  measurements.
- The instance-type claim for the two Q8-era warm boots is an argument, not a lookup: a 33.6 GB blob does not fit
  either 24 GB pool, so both necessarily ran the 48 GB L40S (g6e).  The 08:26 box's type is independently
  documented in post 2's incident anatomy.  The 37-second and 113-second warm deltas, and the 02:11 boot's
  246-second serve, are from the same `BOOTSTAGE` pull as the table.
- The 15-to-27-minute overlap band comes from the two live zero-gap refreshes on record: game day's flip to spot
  ran ~27 minutes launch to drain, and the July 22 autonomous re-arm overlapped old and new boxes for 15 minutes.
- The grace numbers, 15 minutes of instance age matching the ASG health-check grace period and the 30-minute skip
  cap, are the deployed configuration.  The same values ship as the defaults in the companion repo's watchdog
  module.
- The caps table is the deployed plan configuration, and the same numbers are public on the
  [pricing page](https://koleslaw.ai/pricing).
- The fallback error classes, the streaming first-byte behavior, and the keepalive wrapper are from the API's
  public source, quoted verbatim minus imports.  The iptables lines are from the bootstrap script in the companion
  repo.
- The 100-second figure is Cloudflare's documented behavior for proxied connections.  The pre-fix 524s were
  observed on 2026-07-14 while diagnosing them.  No artifact of one survives, so that claim is memory, not a log.
