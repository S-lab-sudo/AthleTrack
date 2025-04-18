const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const TournamentModel = require('../models/tournamentModel');
const TeamModel=require('../models/teamModel')
const MatchModel=require('../models/matchModel');
const PlayerModel = require('../models/playerModel');

const createMatchAndSaveToTournament = async (req, res) => {
  try {
    const { teamAId, teamBId, tournamentId, matchDate } = req.body;

    // Find the tournament
    const tournament = await TournamentModel.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Check if both teams are registered in the tournament
    const isTeamARegistered = tournament.teams.includes(teamAId);
    const isTeamBRegistered = tournament.teams.includes(teamBId);

    if (!isTeamARegistered || !isTeamBRegistered) {
      return res.status(400).json({ message: 'Both teams must be registered in the tournament' });
    }

    // Create a new match
    const match = new MatchModel({
      tournament_id: tournamentId,
      date: matchDate,
      team_1: teamAId,
      team_2: teamBId
    });

    // Save the match
    const savedMatch = await match.save();

    // Add the match ID to the tournament's matches array
    tournament.matches.push(savedMatch._id);
    await tournament.save();

    // Add the match ID to each player's match history in both teams
    const teamA = await TeamModel.findById(teamAId).populate('players');
    const teamB = await TeamModel.findById(teamBId).populate('players');

    const updatePlayerMatchHistory = async (playerId, teamId) => {
      const player = await PlayerModel.findById(playerId);
      player.match_history.push({
        match_id: savedMatch._id,
        tournament_id: tournamentId,
        team_id: teamId,
        points_scored: 0,
        assists: 0,
        rebounds: 0
      });
      await player.save();
    };

    for (const player of teamA.players) {
      await updatePlayerMatchHistory(player._id, teamAId);
    }

    for (const player of teamB.players) {
      await updatePlayerMatchHistory(player._id, teamBId);
    }

    res.status(201).json({ message: 'Match created and added to tournament successfully', match: savedMatch });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

const createTournament = async (req, res) => {
  try {
    const { name, startDate, endDate, location, organizer, prizePool, registeringStartDate } = req.body;

    // Validations
    if (!name || !startDate || !endDate || !location || !organizer || !prizePool || !registeringStartDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    console.log("Test 1 passed");

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }
    console.log("Test 2 passed");

    if (new Date(registeringStartDate) >= new Date(startDate)) {
      return res.status(400).json({ message: 'Registering start date must be before tournament start date' });
    }
    console.log("Test 3 passed");

    // Validate organizer fields
    if (!organizer.name || !organizer.phoneNumber) {
      return res.status(400).json({ message: 'All organizer fields are required' });
    }
    console.log("Test 4 passed");

    // Validate prizePool fields
    if (!prizePool.firstPrize || !prizePool.secondPrize || !prizePool.thirdPrize || !prizePool.entryFee || !prizePool.mvp) {
      return res.status(400).json({ message: 'All prize pool fields are required' });
    }
    console.log("Test 5 passed");

    // Handle file uploads
    if (!req.files || !req.files.posterImage || !req.files.organizerImage) {
      return res.status(400).json({ message: 'Poster image and organizer image are required' });
    }
    console.log("Test 6 passed");

    const posterImage = req.files.posterImage[0];
    const organizerImage = req.files.organizerImage[0];

    // Ensure the public directory exists
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    const posterImagePath = path.join(publicDir, `${Date.now()}-${uuidv4()}-${posterImage.originalname}`);
    const organizerImagePath = path.join(publicDir, `${Date.now()}-${uuidv4()}-${organizerImage.originalname}`);

    fs.writeFileSync(posterImagePath, posterImage.buffer);
    fs.writeFileSync(organizerImagePath, organizerImage.buffer);
    console.log("Test 7 passed");

    const tournament = new TournamentModel({
      name,
      startDate,
      endDate,
      location,
      posterImage: posterImagePath,
      organizer: {
        name: organizer.name,
        image: organizerImagePath,
        phoneNumber: organizer.phoneNumber
      },
      prizePool,
      registeringStartDate
    });

    console.log("Test 8 passed");
    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

const getTournamentAdmin = async (req, res) => {
  try {
    const tournament = await TournamentModel.find();
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(200).json(tournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateTournament = async (req, res) => {
    try {
      const { name, startDate, endDate, location, organizer, prizePool, registeringStartDate } = req.body;
      console.log(req.files)
      console.log(req.body)
  
      // Find the existing tournament
      const tournament = await TournamentModel.findById(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
  
      // Update only the fields that are provided
      if (name) tournament.name = name;
      if (startDate) tournament.startDate = startDate;
      if (endDate) tournament.endDate = endDate;
      if (location) tournament.location = location;
      if (registeringStartDate) tournament.registeringStartDate = registeringStartDate;
  
      if (organizer) {
        if (organizer.name) tournament.organizer.name = organizer.name;
        if (organizer.phoneNumber) tournament.organizer.phoneNumber = organizer.phoneNumber;
      }
  
      if (prizePool) {
        if (prizePool.firstPrize) tournament.prizePool.firstPrize = prizePool.firstPrize;
        if (prizePool.secondPrize) tournament.prizePool.secondPrize = prizePool.secondPrize;
        if (prizePool.thirdPrize) tournament.prizePool.thirdPrize = prizePool.thirdPrize;
        if (prizePool.entryFee) tournament.prizePool.entryFee = prizePool.entryFee;
        if (prizePool.mvp) tournament.prizePool.mvp = prizePool.mvp;
      }
  
      // Handle file uploads
      if (req.files && req.files.posterImage) {
        const posterImage = req.files.posterImage[0];
        const posterImagePath = path.join(__dirname, '../public', `${Date.now()}-${uuidv4()}-${posterImage.originalname}`);
        fs.writeFileSync(posterImagePath, posterImage.buffer);
        tournament.posterImage = posterImagePath;
      }
  
      if (req.files && req.files.organizerImage) {
        const organizerImage = req.files.organizerImage[0];
        const organizerImagePath = path.join(__dirname, '../public', `${Date.now()}-${uuidv4()}-${organizerImage.originalname}`);
        fs.writeFileSync(organizerImagePath, organizerImage.buffer);
        tournament.organizer.image = organizerImagePath;
      }
  
      await tournament.save();
      res.status(200).json(tournament);
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message });
    }
  };

const deleteTournament = async (req, res) => {
  try {
    const tournament = await TournamentModel.findByIdAndDelete(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const getTournaments = async (req, res) => {
  try {
    const tournaments = await TournamentModel.find().sort({ startDate: 1 });
    const currentDate = new Date();

    const latestTournament = tournaments.find(tournament => new Date(tournament.startDate) >= currentDate);
    const upcomingTournaments = latestTournament 
      ? tournaments.filter(tournament => new Date(tournament.startDate) > new Date(latestTournament.startDate)) 
      : [];

    res.status(200).json({
      latestTournament,
      upcomingTournaments,
      allTournaments:tournaments
    });
  } catch (error) {
    console.log(error)
    res.status(400).json({ message: error.message });
  }
};

const assignTeamToTournament = async (req, res) => {
  try {
    const { teamId, tournamentId } = req.body;
    if (!teamId || !tournamentId) {
      return res.status(400).json({ message: 'Team ID and Tournament ID are required' });
    }

    const team = await TeamModel.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const tournament = await TournamentModel.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    tournament.teams.push(team._id);
    await tournament.save();

    res.status(200).json({ message: 'Team assigned to tournament successfully', tournament });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getTournamentAdmin,
  createTournament,
  getTournaments,
  updateTournament,
  deleteTournament,
  getTournamentAdmin,
  assignTeamToTournament,
  createMatchAndSaveToTournament
};