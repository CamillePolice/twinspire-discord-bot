# Twinspire Discord Bot Commands

This document provides a comprehensive list of all available commands in the Twinspire Discord Bot.

## Table of Contents
- [Admin Commands](#admin-commands)
- [Team Commands](#team-commands)
- [Tournament Commands](#tournament-commands)
- [Challenge Commands](#challenge-commands)
- [Maintenance Commands](#maintenance-commands)

## Admin Commands

### Admin Challenge Management
- **Command**: `/admin-challenge`
- **Description**: Admin commands for tournament challenge management
- **Permissions**: Admin only
- **Subcommands**:
  - `view`: View challenge details
  - `check_timeouts`: Check for challenges that have exceeded response time limits
  - `force_result`: Force a challenge result (admin decision)
  - `forfeit`: Force a team to forfeit a challenge
  - `cancel`: Cancel a challenge (no tier changes)
  - `create_team`: Create a new team with specified captain and role
  - `update_team_member`: Update a team member's role and OP.GG link
  - `remove_team_member`: Remove a member from a team
  - `add_team_member`: Add a member to a team

### Check Timeouts
- **Command**: `/check-timeouts`
- **Description**: Check for any pending timeouts in the system
- **Permissions**: Admin only

### Force Result
- **Command**: `/force-result`
- **Description**: Force a result for a challenge when normal resolution is not possible
- **Permissions**: Admin only

### Forfeit
- **Command**: `/forfeit`
- **Description**: Mark a challenge as forfeited by a team
- **Permissions**: Admin only

### Cancel
- **Command**: `/cancel`
- **Description**: Cancel an ongoing challenge or tournament
- **Permissions**: Admin only

## Team Commands

### Create Team
- **Command**: `/create-team`
- **Description**: Create a new team
- **Usage**: `/create-team <team_name> <captain>`

### View Team
- **Command**: `/view-team`
- **Description**: View detailed information about a team
- **Usage**: `/view-team <team_name>`

### Add Member
- **Command**: `/add-member`
- **Description**: Add a new member to a team
- **Usage**: `/add-member <team_name> <member>`

### Remove Member
- **Command**: `/remove-member`
- **Description**: Remove a member from a team
- **Usage**: `/remove-member <team_name> <member>`

### Update Member
- **Command**: `/update-member`
- **Description**: Update a member's role or status in a team
- **Usage**: `/update-member <team_name> <member> <new_role>`

### Transfer Captain
- **Command**: `/transfer-captain`
- **Description**: Transfer team captaincy to another member
- **Usage**: `/transfer-captain <team_name> <new_captain>`

## Tournament Commands

### Create Tournament
- **Command**: `/create-tournament`
- **Description**: Create a new tournament
- **Usage**: `/create-tournament <name> <format> <start_date>`

### View Tournament
- **Command**: `/view-tournament`
- **Description**: View detailed information about a tournament
- **Usage**: `/view-tournament <tournament_id>`

### List Tournaments
- **Command**: `/list-tournaments`
- **Description**: List all active and upcoming tournaments

### Update Status
- **Command**: `/update-status`
- **Description**: Update the status of a tournament
- **Usage**: `/update-status <tournament_id> <new_status>`

### View Standings
- **Command**: `/view-standings`
- **Description**: View current tournament standings
- **Usage**: `/view-standings <tournament_id>`

### Add Team to Tournament
- **Command**: `/add-team`
- **Description**: Add a team to a tournament
- **Usage**: `/add-team <tournament_id> <team_name>`

## Challenge Commands

### Challenge
- **Command**: `/challenge`
- **Description**: Challenge another team to a match
- **Usage**: `/challenge <opponent_team>`

### Propose Dates
- **Command**: `/propose-dates`
- **Description**: Propose match dates to the opposing team
- **Usage**: `/propose-dates <challenge_id> <dates>`

### Schedule Challenge
- **Command**: `/schedule`
- **Description**: Schedule a challenge for a specific date and time
- **Usage**: `/schedule <challenge_id> <date_time>`

### Submit Result
- **Command**: `/submit-result`
- **Description**: Submit the result of a challenge
- **Usage**: `/submit-result <challenge_id> <score>`

### View Challenge
- **Command**: `/view-challenge`
- **Description**: View details of a specific challenge
- **Usage**: `/view-challenge <challenge_id>`

## Maintenance Commands

These commands are used for system maintenance and debugging purposes.

### Maintenance Mode
- **Command**: `/maintenance`
- **Description**: Toggle maintenance mode for the bot
- **Permissions**: Admin only

---

## Notes
- All commands require appropriate permissions to execute
- Some commands may have additional parameters or options not listed here
- For detailed usage of specific commands, use the `/help` command followed by the command name 