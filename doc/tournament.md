# Twinspire Tournament Commands Guide

This guide provides detailed information on using Twinspire Bot's tournament commands, including team management, challenges, and administrator commands.

## Table of Contents
- [General Commands](#general-commands)
- [Team Management](#team-management)
- [Challenge System](#challenge-system)
- [Tournament Administration](#tournament-administration)
- [Maintenance Commands](#maintenance-commands)

## General Commands

### View Tournament Information
```
/tournament view [tournament_id]
```
- Shows details about the current active tournament or a specific tournament if ID is provided
- Displays tournament rules, tier structure, rewards, and key dates

### View Tournament Standings
```
/tournament standings [tournament_id]
```
- Displays current standings with teams grouped by tier
- Shows team statistics including prestige points, win/loss record, and protection status
- Navigation buttons allow browsing different tiers

### List All Tournaments
```
/tournament list
```
- Shows all active tournaments in the system
- Includes basic information about each tournament such as game, format, and dates

## Team Management

### Create a Team
```
/team create <name>
```
- Creates a new team with you as captain
- Teams start at the lowest tier of the tournament
- Each player can only be captain of one team

### View Team Details
```
/team view [team_id]
```
- Shows detailed information about your team or a specified team
- Displays team members, tier position, record, and pending challenges
- Without a team_id, shows information for your team

### Add a Team Member
```
/team add_member <user> [role]
```
- Adds a user to your team
- Optional role parameter allows specifying their position (e.g., Top, Jungle, Mid, ADC, Support)
- Only team captains can add members
- Players can only be on one team at a time

### Remove a Team Member
```
/team remove_member <user>
```
- Removes a user from your team
- Only team captains can remove members
- Captains cannot remove themselves from their team

## Challenge System

### Challenge Another Team
```
/team challenge <team_id>
```
- Initiates a challenge against another team
- Can only challenge teams in the tier immediately above yours
- Recently defended teams have protection periods
- There is a monthly limit on challenges

### Propose Dates (Defending Team)
```
/team propose_dates <challenge_id> <date1> <date2> <date3>
```
- Used by defending team to propose three possible match dates
- Dates must be specified in YYYY-MM-DD HH:MM format
- All proposed dates must be in the future
- Must respond within the tournament's challenge timeframe (default: 10 days)

### Schedule a Challenge (Challenging Team)
```
/team schedule <challenge_id> <date>
```
- Used by challenging team to confirm one of the proposed dates
- Selected date must match one of the dates proposed by the defending team
- Date must be specified in YYYY-MM-DD HH:MM format

### Submit Match Results
```
/team result <challenge_id> <winner> <score>
```
- Records the outcome of a completed match
- Winner can be "Our Team" or "Opponent Team"
- Score must be formatted like "2-0" or "2-1" for a Best of 3
- Only captains of either team can submit results
- Results can only be submitted after the scheduled match time

## Tournament Administration

### Create a Tournament
```
/tournament create <name> <game> <format> <tiers> <start_date> <end_date> [description]
```
- Creates a new tournament with the specified parameters
- Requires Manage Server permissions
- Sets up tier structure automatically based on tier count
- Creates default rules based on Twinspire Ascension League standards

### Update Tournament Status
```
/tournament status <tournament_id> <status>
```
- Changes a tournament's status to upcoming, active, or completed
- Requires Manage Server permissions
- Status changes are announced in the channel

### Admin Challenge Commands
```
/admin-challenge view <challenge_id>
/admin-challenge check_timeouts <tournament_id>
/admin-challenge force_result <challenge_id> <winner> <score> <reason>
/admin-challenge forfeit <challenge_id> <forfeiter> <reason>
/admin-challenge cancel <challenge_id> <reason>
```
- Administrative commands for managing challenges
- View detailed challenge information
- Check for challenges with overdue responses
- Force match results or forfeits in special circumstances
- Cancel challenges without tier changes
- Requires Administrator permissions

## Maintenance Commands

### Set Maintenance Channel
```
/maintenance set_channel <channel>
```
- Sets the channel for tournament maintenance notifications
- Requires Administrator permissions
- Bot must have permission to send messages in the selected channel

### Run Tournament Maintenance
```
/maintenance run
```
- Manually triggers tournament maintenance tasks
- Checks for overdue challenges and handles forfeit conditions
- Requires Administrator permissions

### Check Maintenance Status
```
/maintenance status
```
- Shows current maintenance schedule and settings
- Displays notification channel and scheduler status
- Lists maintenance tasks that are performed

---

## Tips for Using Tournament Commands

1. **Team Creation**: Create your team early to secure your spot in the tournament.
2. **Challenge Timing**: Plan challenges strategically based on your team's availability.
3. **Date Proposals**: When proposing dates as a defending team, consider various time slots to accommodate the challenger.
4. **Results Submission**: Submit match results promptly after completion to keep the tournament flowing.
5. **Command Permissions**: Most team commands can only be used by team captains.

For additional assistance, contact server administrators or moderators.