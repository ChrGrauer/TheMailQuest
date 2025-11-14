
round 1 ESP stat overwiew in destination dashboard
spam complains should be '-'

# Destination consequence dashboards
for instance here: http://localhost:4173/game/NLWNQH/destination/yahoo
## proposition:
keep main metrics at the top of the dashbaord on the same line : total volume processed and User satisfaction (with the warning message is nice, but we should also say why it is decreasing)
then the budget and revenue data (as-is)
and enrich the analytics session with, for each ESP on this destination:
- volume sent vs delivered
- spam volume sent/blocked/delivered
- volume of false positive
- reputation
- number of clients by types
## Spam data not easily usable
percentages are not easy to interpret (and they are really small). real volume would be better
![[Pasted image 20251114103435.png]]


## user satisfaction
user satisfaction info is in double. we should keep only one. the warning message is nice, but we should also say why it is decreasing (here the users are getting to much spam, but it could also be to much false positives)
![[Pasted image 20251114103611.png]]

## ESP behaviour analysis
content is too poor, we need to enrich



# ESP consequence dashboards
for instance here: http://localhost:4173/game/NLWNQH/esp/sendbolt

## Client perf

warmup adjustment message is not clear
![[Pasted image 20251114104553.png]]
message should be in gray (not green) and just informative, something like : "initial volume reduced for warmup"

## Revenue

we need to check if it is computed correctly. warmup divide first rounf volume by 2, and so should revenue. here it seems the revenue is computed based on the warmup volume delivery
![[Pasted image 20251114105104.png]]

## Reputation change
client risk malus is a weithed average, whereas the warmup is just a static bonus. I think it should be weighted as well (by the volume)
![[Pasted image 20251114105236.png]]

## spam complains
we need to show spam complains to ESP (per client)


# Round 2

ESP budget not updated (same for destination)

![[Pasted image 20251114105929.png]]


Destination timer expired
![[Pasted image 20251114105956.png]]
(fixed when refrshed)


ESP dashboard
reputation by destination not updated (need to refresh to get the correct data)


# spam trap

acquired round 1 but still applied round 2