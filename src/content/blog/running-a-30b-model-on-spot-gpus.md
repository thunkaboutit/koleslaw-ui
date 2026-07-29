---
title: 4 hours and 37 minutes of serving nothing
description: Running a 30B model on spot GPUs cut the bill from $588 to $245 a month. First, spot emptied the fleet for 4 hours and 37 minutes, because an armed 100%-spot ASG is never passive.
date: 2026-08-08
series: Cutting a 30B model's hosting bill
part: 2
tags: [ aws, spot, autoscaling, gpu, koleslaw ]
draft: true
---

> Working draft. Fifth pass; review verdict was "this file is done,
> the remaining work is outside the document."  Open before publish:
> (1) RESOLVED 2026-07-28: the companion repo is public and
> anon-verified; the links are live. (2) Post 1 back-edit CONFIRMED on disk
> 2026-07-27 (its closing line now reads "four hours and thirty-seven
> minutes at zero"), uncommitted alongside this file. Land both in
> the same commit. (3) Title decided 2026-07-27 (cp): doubles as the
> HN title. Slug stays running-a-30b-model-on-spot-gpus on purpose:
> the URL keeps the search phrase the title gave up. Pattern adopted
> for the rest of the series (outline §2.7). (4) The giving-up email
> block and the state-machine diagram contain em-dashes and arrows.
> Verbatim machine output, exempt from the no-em-dash rule. Do not
> "fix" them. (5) The Trash detail stays OUT (cp 2026-07-27: the
> morning's mechanics are not reconstructible, and the detection
> paragraph now says so honestly). The email's delivery is still
> receipted via the mailbox-corroboration bullet. (6) Remove this
> note.

```text
an instance was started in response to a difference between desired and
actual capacity, increasing the capacity from 1 to 2
```

My Auto Scaling group logged that cause at 08:24:48 UTC on July 16. The capacity it wanted to increase was the GPU fleet
behind
[Koleslaw](https://koleslaw.ai), the prompt enhancer this series is about, and that fleet is one instance. It wanted a
second so it could take away the first. 8.7 seconds later it began terminating the healthy on-demand box that had been
serving all night.

The replacement was a spot instance. AWS flagged it for reclamation 74 seconds after launching it and took it back 20
minutes in. For the next 4 hours and 37 minutes, the fleet was zero instances.

Nothing went down. The API noticed within seconds and routed every request to a cloud fallback model. Users kept getting
answers. The whole thing ran its course overnight, and I slept through almost all of it, which I stand by.

[Post 1](/blog/the-quantization-that-didnt-fit) quantized the 31.6B model onto a card that
costs $588 a month on demand. This post cuts that to ~$245 with spot pricing. Getting there took one flag, the morning
above, a redesign, and a ~200-line supervisor that has since sat through four reclamations in 48 hours with no help from
me. The code is in a [companion repo](https://github.com/thunkaboutit/koleslaw-ops-spot-watchdog).

## The cheap idea

| Purchase mode | g6.xlarge (L4, 24 GB) | Per month |
|---------------|-----------------------|-----------|
| On-demand     | $0.8048/hr            | ~$588     |
| Spot          | ~$0.33 to 0.35/hr     | ~$245     |

Same instance, same card, roughly 60% off. The catch is printed on the tin: AWS can reclaim a spot instance with two
minutes of notice.

Spot for this box should be fine. The instance is stateless in the way that matters: the model cache rebuilds from S3 in
minutes, and an interruption costs a short window of degraded service behind a cloud fallback, not an outage. That
reasoning is correct, and nothing in this post says spot is dangerous. The lesson is narrower. An armed 100%-spot ASG is
never passive, and I armed one without knowing what that meant.

The order of events matters, because the first attempt predates post 1's quantization by a day:

1. July 15: the model is still the Q8_0, on the big g6e.xlarge. I flip
   `use_spot = true`. There is no g6e spot capacity that night, nothing launches, and the change looks inert.
2. July 16, morning: the incident above, in the middle of a g6e capacity drought.
3. July 16, 13:22 UTC: reverted to on-demand. The quantization cutover ships the same afternoon and moves the model to a
   g6.xlarge at $588 a month. That story is post 1.
4. July 16, evening: the watchdog below gets built and deployed, inert.
5. July 18: game day, then spot armed for real.  ~$245 a month since, minus one stretch this post gets to.

Two independent cost levers, pulled in the order they became available.

## The morning of July 16

With `use_spot = true` applied and no spot capacity available, the group does not go idle. It holds a desired capacity
of 1, sees a policy that says its one running instance is the wrong kind, and works to fix the difference. Forever.

| Time (UTC) | Event                                                                                                                                             |
|------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| overnight  | A failed spot launch every ~10 min, all night: `Could not launch Spot Instances. UnfulfillableCapacity`                                           |
| 08:24:48   | A spot launch finally succeeds                                                                                                                    |
| 08:24:56   | The ASG begins terminating the healthy on-demand instance                                                                                         |
| 08:26:02   | AWS issues a rebalance recommendation against the new spot box, 74 seconds after granting it.  Failed attempts to pre-provision a successor begin |
| 08:44:48   | The spot instance is reclaimed.  It lived 20 minutes                                                                                              |
| 08:44:52   | Relaunch retries begin: gaps of ~11s, ~11s, ~65s, ~65s, ~2m, ~2m, ~4m, ~8m, then a steady ~10 min                                                 |
| 09:05:40   | The no-healthy-hosts alarm fires.  SNS email out                                                                                                  |
| 13:21:36   | The first on-demand launch attempt.  This is the human fix landing: `use_spot = false`, apply                                                     |
| 13:22:01   | An on-demand launch succeeds                                                                                                                      |
| 13:35:40   | The alarm clears                                                                                                                                  |

Zero instances from 08:44:48 to 13:22:01. Four hours, thirty-seven minutes. A healthy serving target again at 13:35:40,
which makes it 4 hours 51 minutes end to end from reclaim to recovery.

Three details deserve a second look.

The 8.7-second swap. The ASG launched the spot box at 08:24:48.006 and began draining the healthy on-demand box
at 08:24:56.718. The table rounds to whole seconds, the prose does not. No soak time, no grace period. A capacity-driven
replacement trusts the new instance the moment it exists.

The 74-second warning. AWS's own rebalance recommendation flagged the new spot box as at-risk 74 seconds after granting
it, and the ASG spent the box's entire 20-minute life failing to pre-provision a successor, because there was none to be
had. A drought is exactly when a briefly-available spot instance is worth the least, and exactly when an armed group
will grab one.

The detection gap. The alarm fired at 09:05:40, 21 minutes after the fleet hit zero: the 12-minute evaluation window
plus drain and metric lag. The email arrived at 3:05 in the morning my time and did exactly what a 3am email does:
nothing. I was asleep. The monitoring worked end to end. The entire on-call rotation was in bed. The rotation is one
person, that person has a day job, and the sleep was overdue.

The fix landed at 13:21:36, 7:21 am local: `use_spot = false`, apply. Four hours and sixteen minutes, email to fix, and
I cannot even reconstruct what surfaced it first that morning, the email or the product itself. That gap is part of why
the redesign hands the response to a Lambda and demotes email to commentary.

Keep that gap in mind for the end of this post, where it comes back measured in days, with a very different price on it.

I had applied the flag the previous evening, watched it fail to find capacity, and mentally filed the change as inert. A
100%-spot policy with no capacity is not inert. It is a retry loop, and the loop's exit condition is finding exactly the
kind of instance a drought makes worthless. Nothing disarms it short of changing the policy.

## Purchase mode is a lever, not an apply

The redesign starts from one decision. Flipping between spot and on-demand has to be an operational action: fast,
reversible, and runnable by a Lambda at 3am. A Terraform apply is none of those things.

So the ASG now always carries a mixed-instances policy, and what changes at runtime is one integer inside it:

`InstancesDistribution.OnDemandPercentageAboveBaseCapacity`

0 means all spot. 100 means all on-demand. Terraform is told to ignore changes to exactly that path, and nothing else:

```hcl
lifecycle {
  ignore_changes = [
    mixed_instances_policy[0].instances_distribution[0].on_demand_percentage_above_base_capacity,
  ]
}
```

The precision matters. The tempting shortcut is ignoring the whole
`mixed_instances_policy` block, and it is a mistake: the block also embeds `launch_template_specification.version`, and
ignoring that quietly breaks the instance refresh that rolls the fleet on model updates. Ignore the one indexed
attribute.

The flip itself is one read-modify-write against the live group:

```bash
policy=$(aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG" \
  --query 'AutoScalingGroups[0].MixedInstancesPolicy' |
  jq -c '.InstancesDistribution.OnDemandPercentageAboveBaseCapacity = 0
       | del(.LaunchTemplate.LaunchTemplateSpecification.LaunchTemplateName)')

aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name "$ASG" --mixed-instances-policy "$policy"
```

The distribution only affects new launches, so the flip churns nothing. Running instances stay. The next launch,
whenever it comes, honors the new percentage. (The `del` is an API quirk: describe returns both the launch template's
name and id, and update refuses to take both back.)

The policy also lists two instance pools, g6.xlarge and g5.xlarge, with
`price-capacity-optimized` spot allocation. Two pools is not caution. It is the whole menu: the quantized model needs a
24 GB card, the floor post 1 set, and the L4 and the A10G are the only 24 GB options in this size class. A g4dn's T4 has
16 GB, and a 17.0 GiB file plus context does not fit. Cross-pool self-healing is real and absorbs most routine reclaims
on its own. July 22 will show the case it cannot absorb: both pools drying up at once.

Before anything else was built on top of this, a gate had to pass. Apply the Terraform. Flip the percentage from 100 to
0 by CLI. Run
`plan`: it must be clean. Flip back to 100. Clean again. If the plan fights the lever in either direction, someone
eventually reverts a 3am failover with an innocent-looking apply. The testing thread of this post starts here, not at
game day.

## The watchdog

The lever still needs a hand on it. That hand is a ~200-line Lambda with `reserved_concurrent_executions = 1` doubling
as its own state mutex, one SSM parameter holding state, an EventBridge rule on the
`ollama-no-healthy-hosts` alarm, a 30-minute scanner, and an SNS email on every transition.

A throttled invoke is not a lost invoke, because EventBridge calls the Lambda asynchronously: anything the concurrency
cap defers queues and retries. Every path re-reads state first and no-ops when the work is already done, so a replayed
event lands on nothing.

The whole state machine:

```text
spot-armed ──(no healthy GPU target for 12 min)──► on-demand-failover
                                                    pct→100, SNS email

on-demand-failover ──(placement score ≥3 on 2 consecutive
                      30-min scans AND ≥3h since failover)──► spot-armed
                                                    pct→0 + zero-gap refresh

on-demand-failover ──(≥2 failovers in 24h)──────► on-demand-pinned
                                                    "flapping, giving up"

on-demand-pinned ◄──(manual only: scripts/gpu-mode.sh)──► any
```

Two terms. The placement score is AWS's own 1-to-10 estimate of whether a spot launch in a pool would succeed, from the
`get-spot-placement-scores` API. A zero-gap refresh is a launch-before-terminate instance refresh: the new box comes up
and gets healthy before the old one drains, so a planned transition serves throughout. Post 3 covers that machinery.

Every threshold has a reason, and the reasons are the part worth stealing:

| Threshold        | Value                            | Reason                                                                             |
|------------------|----------------------------------|------------------------------------------------------------------------------------|
| Failover trigger | 12 min with no healthy target    | A routine reclaim plus warm relaunch is 4 to 6 min and must not trigger a failover |
| Re-arm score     | placement ≥3                     | AWS's "moderate".  It was the manual runbook's gate before it was the Lambda's     |
| Re-arm streak    | 2 consecutive scans              | One good score is a flicker.  Two, 30 minutes apart, is a trend                    |
| Cooldown         | 3 h since last failover          | Droughts run hours.  Re-arming into one schedules the next failover                |
| Give-up valve    | 2 failovers in 24 h, then pinned | The model of reality is wrong.  Stop flapping and get a human                      |

The worst-case drought math, summed from components rather than asserted:

| Component                       | Budget                                                       | Observed (July 22, twice) |
|---------------------------------|--------------------------------------------------------------|---------------------------|
| Reclaim to alarm                | ~21 min (12-min evaluation window plus drain and metric lag) | ~21 min                   |
| Alarm to purchase-mode flip     | under 1 min                                                  | ~2 s                      |
| Flip to a replacement launching | up to ~10 min of ASG retry loop                              | 6 to 9 s                  |
| Launch to serving (warm boot)   | 4 to 6 min                                                   | 4 to 6 min                |

The components sum to ~26 minutes when the retry loop is kind and nearly 40 when it is not. Call it 25 to 40 minutes of
degraded service per drought, worst case, and degraded means slower answers from the fallback model, not downtime. The
baseline it replaced was 4 hours and 37 minutes.

## Not authorized to use launch template

Game day for this system ran on July 18, and this section is the bug that justifies the whole ritual. Under live replay
load, the first real purchase-mode flip died:

```text
[ERROR] ClientError: An error occurred (AccessDenied) when calling the
UpdateAutoScalingGroup operation: You are not authorized to use launch
template: lt-0123456789abcdef0
```

(Template id redacted. Everything else verbatim, because this is the string you will google.)

The Lambda's role had `autoscaling:UpdateAutoScalingGroup`. The call it made did not touch the launch template. It
changed one integer, the on-demand percentage. The error fires anyway, and the reason is not documented anywhere I could
find: when an `UpdateAutoScalingGroup` call carries a mixed-instances policy, AWS validates that the caller could
actually use the launch template inside it. Not read it. Use it. The check effectively dry-runs the whole launch: the
AMI, the network interfaces, the volumes, and the template's `tag_specifications`.

The obvious least-privilege fix fails.  `ec2:RunInstances` scoped to the launch template's ARN still gets`AccessDenied`.
I verified that twice, across two separate scan cycles, because I did not believe it the first time. The dry-run wants
the full spread of resources a real launch would touch.

The policy that works:

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "ec2:CreateTags",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:CreateAction": "RunInstances"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "<your-gpu-instance-role-arn>",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ec2.amazonaws.com"
        }
      }
    }
  ]
}
```

About that `*`. The security-relevant half of launching an instance is which IAM role the instance carries, and that is
the `PassRole`
statement, scoped tight. The `CreateTags` grant only works during a launch. The broad `RunInstances` is the price of the
hidden dry-run, and the condition keys around it are what make the price acceptable.

## The failover every test had blessed

Here is what turns an IAM footnote into the reason this post exists.

The function that flips the percentage, `set_pct`, is shared. The failover path calls it with 100. The re-arm path calls
it with 0. The permission was broken for both. From the moment the watchdog deployed until game day, the failover path,
the thing whose entire job is to answer a 3am drought without me, was dead.

Every test it had been given had passed. The synthetic invokes ran in pinned mode, where the handler correctly no-ops
before reaching the flip. Every real percentage change had been run by me, from a terminal, under operator credentials
that carry admin. The one caller that mattered, the Lambda's own role, had never once executed the one call that
mattered.

A safety mechanism that has passed every test it was given can still be dead. The only test that counts runs the real
path, with the real credentials, under real load. That is what a game day is for.

## Game day

The protocol, in one list. Live replay load throughout, and every transition exercised for real, in production:

1. Arm spot and let the scanner's streak gate pass on real placement scores. No shortcuts.
2. Flip to spot through the zero-gap refresh.
3. Synthetic alarm: hand-built EventBridge event, watch the failover.
4. Real reclaim: terminate the serving spot instance with no warning.
5. Attempt a re-arm inside the cooldown. It must refuse.
6. Hand-edit the failover history to two entries. The give-up valve must pin.

The load was `load-replay.py` from the companion repo: ~4 requests per minute of held-out validation-set prompts
replayed against the public API, cache-busted so every request does real GPU work.  ~980 requests over the day.

| Test                     | Result                                                                                           |
|--------------------------|--------------------------------------------------------------------------------------------------|
| Zero-gap flip to spot    | ~27 min launch to drain.  0 errors, 0 fallbacks across 601+ live requests through the transition |
| Synthetic alarm          | pct→100 and a failover email.  The healthy spot box correctly kept serving                       |
| Real terminate           | ~5.5 min on the fallback model, then a warm on-demand boot.  Exactly one broken in-flight stream |
| Re-arm inside cooldown   | Refused                                                                                          |
| Two failovers in history | Auto-pinned, "giving up" email sent                                                              |

Across the ~980 replay requests, the error count for the whole day was 1: that single broken stream, a request caught
mid-flight by the terminate. Everything else completed, most of it on the GPU, one 5.5-minute window's worth on the
fallback.

Two incidental findings. After the terminate test, the scanner re-armed spot on its own at 11:41 UTC. First fully
autonomous transition, and a preview of the closing scene. And the spot pool handed over a g5.xlarge with an A10G
instead of the L4. The A10G is quicker on this model:
replay enhances ran 6 to 8 seconds on it, against the 12 to 15 second mean on the L4. Cheaper and faster, for the second
time in this series.

## Four reclaims in 48 hours

Game day proves the machine works while you watch it. July 21 and 22 proved it works when nobody is watching. Everything
below happened unattended. Times are UTC, from the ASG activity history, the alarm history, and the watchdog's logs.

July 21, 00:39:14. Reclaim #1. The policy's other pool had capacity and a replacement spot instance launched 15 seconds
later. Warm boot, back to serving. The 12-minute threshold rode it out and the failover never triggered. No alarm, no
email, no story. That is the thresholds table doing its job.

July 22, 00:14:30. Reclaim #2, and this time it is a drought. The retry loop churns for 21 minutes. 00:35:41, the alarm
fires. 00:35:43, the watchdog flips to on-demand. Two seconds. 00:35:48, an on-demand replacement is launching, 7.6
seconds after the alarm. Total degraded window, reclaim to warm: ~26 minutes. My contribution: none.

Then the watchdog waits out its own rules. The scan log reads like a metronome: 352 seconds since failover, then 2,152,
then 3,952, each scan refusing to re-arm against the 10,800-second cooldown. 03:41:35, cooldown cleared, placement score
3, streak 1. 04:11:36, score 3 again, streak 2. The Lambda flips to spot and starts a zero-gap refresh. 04:11:54, the
spot instance launches. 04:27:03, the on-demand box terminates after 15 minutes of overlap. No serving gap. Nobody was
needed.

The spot market that day was hostile, and the numbers are worth staring at. From 04:30 to 21:05 the fleet stayed up
for ~17 hours across two instances while rebalance warnings triggered 66 pre-provision launch attempts. All 66 failed.
Both pools, g6 and g5, for hours. The fleet served through all of it.

Reclaim #3, at 12:14:36, is a parenthesis on purpose: replaced across pools in ~2 minutes, no alarm, no story. That is
the thresholds table working mid-drought, and it is why this section counts four reclaims while the alarm history shows
only two.

21:05:58. Reclaim #4, drought again. 22 minutes of failed launches, alarm at 21:27:41, flip at 21:27:43. Two seconds,
again. An on-demand box is launching at 21:27:51, and the degraded window comes in at ~26 minutes, again.

21:41:35. The scanner counts two failovers inside 24 hours and takes itself out of the game:

```text
GPU watchdog: GIVING UP — pinned on-demand

2 failovers in 24h — flapping. Spot pools are churnier than the model
assumes. Staying on-demand until a human reviews and re-arms
(gpu-mode.sh arm).
```

That is the give-up valve, and it is my favorite part of the design. The watchdog's model of the world is simple:
droughts are rare and hours long. Two failovers in a day is evidence the model is wrong, and a control system that knows
its model is wrong should stop acting on it. It pinned on-demand, sent the email above, and every scan after logged
`pinned; nothing to do`.

Now the honest coda. That email went out at 21:41 on July 22. I re-armed on July 27. The machine asked for a human and
the human took four and a half days to show up. In my defense: day job, family, and an email whose entire message was
that nothing needed me urgently. The whole time, prod sat safely on on-demand at ~$19 a day instead of ~$8 on spot. Call
it $50 of human latency.

Compare the two incidents. On July 16 the alarm email arrived at 3am and the product stayed degraded while I slept,
because the human was the failover. On July 22 every email arrived and I did not act on them for four and a half days,
and that cost $50 and zero degradation, because the machine had made the system safe before it asked. That is the whole
job description of this kind of automation. It cannot remove the human, so it converts human latency from an
availability problem into a small billing problem.

It is also the answer to a fair question: why is there still no pager on this system? Paging is for problems only a
human can fix, and the point of the design was to shrink that set toward zero. What remains arrives by email, priced in
dollars.

The re-arm is deliberate by design: `gpu-mode.sh arm`, a human command, issued after reading the drought evidence and
deciding the market had calmed. Even then the scanner keeps its own gate. It wanted two scans of score 3 and got them,
then flipped to spot at 08:41 through the usual zero-gap refresh. Zero errors. The bill went back to ~$245 a month.

## Why us-east-2

The region was picked for spot before any of this, and the choice held:

|                   | us-east-2 | us-east-1        |
|-------------------|-----------|------------------|
| g6.xlarge spot    | ~$0.33/hr | $0.45 to 0.75/hr |
| Interruption band | 10 to 15% | >20%             |
| Placement score   | 3         | 3                |

Multi-region spot chasing was evaluated and rejected. The other US regions had worse prices, worse interruption bands,
and no usable GPU quota, and cross-region failover is a lot of machinery for the rare hours when both local pools are
dry. us-east-1 later got a quota approved and now sits as a disaster-recovery option, not a home.

## The result

The GPU line went from $588 to ~$245 a month, on top of post 1's \$1,360 to \$588. The full arc is \$1,360 to \$245,
about 82% off, for the same product answering the same requests faster.

The watchdog itself costs approximately nothing. A Lambda that runs for seconds every 30 minutes, one SSM parameter, one
alarm, and a handful of emails sit in the rounding error of an AWS bill. What it does is protect
the ~$343 a month the spot discount is worth, by making spot's failure mode boring: ~26 minutes of slower answers per
drought, observed twice, and a $50 safety margin the one time the market got genuinely weird.

Every one of those degraded windows was absorbed by a fallback that took real design work. That is the next post:
designing for the GPU being gone. When a two-minute warning is a normal Tuesday, degraded is not an incident state. It
is a product state, and it has to be designed like one.

> ## Reproduce this
>
> **You need:** an Auto Scaling group behind any load balancer with a
> target-health alarm, a Lambda, an SSM parameter, and an SNS topic.
> Nothing here is GPU-specific. The same design fits any spot-backed,
> slow-to-warm workload where a reclaim costs minutes.
>
> **Artifacts:** the
> [companion repo](https://github.com/thunkaboutit/koleslaw-ops-spot-watchdog)
> holds the watchdog Lambda and its Terraform module, the ASG module
> with the `ignore_changes` wiring, `gpu-mode.sh` (status / pin / arm),
> and `load-replay.py`.  `examples/complete` wires them to an alarm and
> a topic.
>
> **Steps:**
>
> 1. Give the ASG a permanent mixed-instances policy. Purchase mode is
>    the `OnDemandPercentageAboveBaseCapacity` integer, nothing else.
> 2. Add `ignore_changes` on exactly that indexed attribute.
> 3. Run the drift gate: apply, flip 100 to 0 and back by CLI, and
>    confirm the plan is clean both ways.
> 4. Deploy the watchdog pinned (inert) and verify the no-op paths.
> 5. Pick your own thresholds and write down the reason for each. Mine
>    are in the table above. Yours will differ, because your recovery
>    timings differ.
> 6. Run a game day under real load before you arm it. Include a real
>    terminate, and at least one flip under the Lambda's own
>    credentials. That last clause is the whole post.
>
> **Expected output:** a purchase-mode lever your Terraform never
> fights, and a failover you have watched work before it has to work
> without you.
>
> **Total cost to reproduce:** ~$0 in AWS parts. The Lambda, the
> parameter, the alarm, and the emails round to zero at this scale.
> What it protects is your spot discount, ~$343 a month here.

## Receipts

- Every timestamp is from the AWS side: ASG activity history, CloudWatch alarm history, and the watchdog Lambda's logs,
  pulled 2026-07-27. Times UTC. The two-second alarm-to-flip figures are the alarm history's state-change time against
  the Lambda's logged flip, observed at both failovers (00:35 and 21:27 on July 22).
- The cold open's cause text is the activity entry's `Cause` field with its leading `At <timestamp>` clause trimmed.
- Prose durations come from the sub-second timestamps (08:24:48.006 to 08:24:56.718 is the 8.7 s, 00:35:41.209
  to 00:35:48.812 the 7.6 s). Timestamps in tables and inline round to whole seconds.
- The alarm emails cited are corroborated against my own mailbox: Date headers match the server-side sends within 1 to 3
  seconds, from the 07-16 09:05 ALARM through the 07-27 re-arm.
- The IAM error block is verbatim from the Lambda's log, where it appears six times on 2026-07-18. The launch template
  id is redacted. The policy shown is the deployed one, with the role ARN replaced by a placeholder.
- The giving-up email block is the subject and body the Lambda sends, verbatim from source, matching the send logged at
  21:41:35 on July
    22.
- Prices are AWS published on-demand rates and observed spot rates, us-east-2, July 2026. Monthly figures are hourly ×
  730. Spot moves, so ~$245 is a band, not a constant. The $50 pin cost is (\$19.32 −
  ~\$8) per day across the 4.4 pinned days.
- Interruption bands are the AWS Spot Instance Advisor's, as read in July 2026. Placement scores are from
  `get-spot-placement-scores`.
- The 601+ request / 0 error transition figure and the day's single broken stream are the replay client's own tally from
  the 2026-07-18 game day, ~980 requests total.
- Latency figures name their card. 6 to 8s per enhance: game-day replay observation, A10G (g5.xlarge). 12 to 15s mean:
  production figure from post 1, L4 (g6.xlarge). Neither is a benchmark.
- The allocation strategy and pools are from a live describe of the ASG, 2026-07-27:
  `OnDemandAllocationStrategy: prioritized`,
  `SpotAllocationStrategy: price-capacity-optimized`, pools g6.xlarge and g5.xlarge.
