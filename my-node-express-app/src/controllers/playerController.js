const Player = require('../models/playerModel');

const getAllPlayers = async (req, res) => {
    try {
        const players = await Player.find()
        res.status(200).json(players);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

const getPlayerById = async (req, res) => {
    try {
        const { id } = req.params;
        const player = await Player.findById(id);
        if (!player) {
            return res.status(404).json({ message: 'Player not found' });
        }
        res.status(200).json(player);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}


module.exports = {
    getAllPlayers,
    getPlayerById
    // Add other player-related functions here
};
