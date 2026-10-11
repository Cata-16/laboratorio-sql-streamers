
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../services/mysql.service');

// Carga de juegos
async function loadGames() {

    const connection = await pool.getConnection();

    try {

        // Lectura del CSV
        const rows = await new Promise((resolve, reject) => {

            const data = [];

            fs.createReadStream('./data/streamers.csv')
                .pipe(csv())
                .on('data', (row) => data.push(row))
                .on('end', () => resolve(data))
                .on('error', reject);

        });

        // Juegos unicos del CSV
        const games = new Map();

        for (const row of rows) {

            if (row.MOST_STREAMED_GAME?.trim()) {
                const game = row.MOST_STREAMED_GAME.trim();
                games.set(game.toLowerCase(), game);
            }

            if (row['2ND_MOST_STREAMED_GAME']?.trim()) {
                const game = row['2ND_MOST_STREAMED_GAME'].trim();
                games.set(game.toLowerCase(), game);
            }
        }

        // Juegos existentes
        const [existingGames] = await connection.query(
            'SELECT game_id, game_name FROM game'
        );

        const gameMap = new Map();

        let nextId = 1;

        for (const game of existingGames) {

            gameMap.set(game.game_name.toLowerCase(), game.game_id);

            const match = game.game_id.match(/^GAME(\d+)$/);

            if (match) {
                nextId = Math.max(nextId, Number(match[1]) + 1);
            }
        }

        // Inserta solo juegos nuevos
        for (const [key, game] of games) {

            if (gameMap.has(key)) {
                continue;
            }

            const gameId = `GAME${String(nextId).padStart(3, '0')}`;

            await connection.query(
                `INSERT INTO game (game_id, game_name)
                 VALUES (?, ?)`,
                [gameId, game]
            );

            gameMap.set(key, gameId);
            nextId++;
        }

        console.log('Juegos cargados correctamente');

    } catch (error) {

        console.error('Error al cargar juegos:', error);

    } finally {

        connection.release();
        await pool.end();

    }
}

// Ejecuta carga
loadGames();
