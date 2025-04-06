export type TeamMember = {
  discordId: string;
  isCaptain: boolean;
};

export type Team = {
  teamId: string;
  name: string;
  members: TeamMember[];
};
