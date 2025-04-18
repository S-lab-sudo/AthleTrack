const MatchModel = require('../models/matchModel');
const TeamModel =require('../models/teamModel')
const TournamentModel =require('../models/tournamentModel')
const PlayerModel = require('../models/playerModel');
// Get all matches
const getAllMatches = async (req, res) => {
  try {
    const matches = await MatchModel.find();

    const matchDetails = await Promise.all(matches.map(async (match) => {
      let team1 = await TeamModel.findById(match.team_1).populate('players');
      let team2 = await TeamModel.findById(match.team_2).populate('players');
      const tournament = await TournamentModel.findById(match.tournament_id);

      return {
        matchId: match._id,
        date: match.date,
        team1Id: match.team_1,
        team2Id: match.team_2,
        playerStats: match.player_stats,
        team1Name: team1 ? team1.team_details.name : 'Team not found',
        team2Name: team2 ? team2.team_details.name : 'Team not found',
        tournamentName: tournament ? tournament.name : 'Tournament not found',
        team1Players: team1 ? team1.players : [],
        team2Players: team2 ? team2.players : []
      };
    }));

    res.status(200).json(matchDetails);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

// Get a single match by ID
const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await MatchModel.findById(id).populate('team_1 team_2');
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.status(200).json(match);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

// Update a match
const updateMatch = async (req, res) => {
  try {
    const { matchId, team1Players, team2Players } = req.body;
    console.log(team1Players)

    // Find the match
    const match = await MatchModel.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Helper function to update player stats
    const updatePlayerStats = async (players, previousStats) => {
      for (const player of players) {
        const playerRecord = await PlayerModel.findById(player.playerId);
        if (playerRecord) {
          // // Subtract previous stats if they exist
          // if (previousStats[player.playerId]) {
          //   playerRecord.total_points -= previousStats[player.playerId].points;
          //   playerRecord.total_assists -= previousStats[player.playerId].assists;
          //   playerRecord.total_rebounds -= previousStats[player.playerId].rebounds;
          // }

          // Add new stats
          playerRecord.total_points += player.points;
          playerRecord.total_assists += player.assists;
          playerRecord.total_rebounds += player.rebounds;

          await playerRecord.save();
        }
      }
    };

    // Store previous stats for re-updating
    const previousStats = {};
    match.player_stats.forEach((stat) => {
      previousStats[stat.player_id] = {
        points: stat.points,
        assists: stat.assists,
        rebounds: stat.rebounds,
      };
    });

    // Update player stats for both teams
    await updatePlayerStats(team1Players, previousStats);
    await updatePlayerStats(team2Players, previousStats);

    // Update `player_stats` in the match
    match.player_stats = [
      ...team1Players.map((player) => ({
        player_id: player.playerId,
        team_id: match.team_1,
        points: player.points,
        assists: player.assists,
        rebounds: player.rebounds,
      })),
      ...team2Players.map((player) => ({
        player_id: player.playerId,
        team_id: match.team_2,
        points: player.points,
        assists: player.assists,
        rebounds: player.rebounds,
      })),
    ];

    // Calculate total points for both teams
    const team1TotalPoints = team1Players.reduce((sum, player) => sum + player.points, 0);
    const team2TotalPoints = team2Players.reduce((sum, player) => sum + player.points, 0);

    // Determine the winner
    let winnerId = null;
    if (team1TotalPoints > team2TotalPoints) {
      winnerId = match.team_1;
    } else if (team2TotalPoints > team1TotalPoints) {
      winnerId = match.team_2;
    }
    match.winner = winnerId;

    // Update team stats
    const updateTeamStats = async (teamId, isWinner, totalPoints, previousTotalPoints) => {
      const team = await TeamModel.findById(teamId);
      if (team) {
        // Adjust total points scored
        team.team_details.total_points_scored -= previousTotalPoints;
        team.team_details.total_points_scored += totalPoints;

        // Adjust matches won/lost
        if (isWinner) {
          if (match.winner !== teamId) {
            team.team_details.matches_won += 1;
            team.team_details.matches_lost -= 1;
          }
        } else {
          if (match.winner === teamId) {
            team.team_details.matches_won -= 1;
            team.team_details.matches_lost += 1;
          }
        }

        await team.save();
      }
    };

    // Update team stats for both teams
    await updateTeamStats(match.team_1, winnerId === match.team_1, team1TotalPoints, match.team_1_total_points || 0);
    await updateTeamStats(match.team_2, winnerId === match.team_2, team2TotalPoints, match.team_2_total_points || 0);

    // Save the updated match
    match.team_1_total_points = team1TotalPoints;
    match.team_2_total_points = team2TotalPoints;
    await match.save();

    res.status(200).json({ message: 'Match updated successfully', match });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a match by ID
const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await MatchModel.findByIdAndDelete(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAllMatches,
  getMatchById,
  updateMatch,
  deleteMatch
};


