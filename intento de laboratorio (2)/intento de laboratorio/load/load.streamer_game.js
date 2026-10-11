
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../services/mysql.service');

// Carga de relaciones
async function loadStreamerGames() {

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

        // Insercion de relaciones
        let id = 1;

        for (const row of rows) {

            // Busca streamer
            const [streamers] = await connection.query(
                `SELECT streamer_id
                 FROM streamer
                 WHERE streamer_name = ?
                 LIMIT 1`,
                [row.NAME.trim()]
            );

            if (streamers.length === 0) {
                throw new Error(`Streamer no encontrado: ${row.NAME}`);
            }

            const streamerId = streamers[0].streamer_id;

            // Juego principal
            if (row.MOST_STREAMED_GAME?.trim()) {

                const [games] = await connection.query(
                    `SELECT game_id
                     FROM game
                     WHERE game_name = ?
                     LIMIT 1`,
                    [row.MOST_STREAMED_GAME.trim()]
                );

                if (games.length === 0) {
                    throw new Error(
                        `Juego no encontrado: ${row.MOST_STREAMED_GAME}`
                    );
                }

                await connection.query(
                    `INSERT INTO streamer_game
                    (streamer_game_id, streamer_id, game_id, game_role)
                    VALUES (?, ?, ?, ?)`,
                    [
                        `SG${String(id++).padStart(4, '0')}`,
                        streamerId,
                        games[0].game_id,
                        'main'
                    ]
                );
            }

            // Juego secundario
            if (row['2ND_MOST_STREAMED_GAME']?.trim()) {

                const [games] = await connection.query(
                    `SELECT game_id
                     FROM game
                     WHERE game_name = ?
                     LIMIT 1`,
                    [row['2ND_MOST_STREAMED_GAME'].trim()]
                );

                if (games.length === 0) {
                    throw new Error(
                        `Juego no encontrado: ${row['2ND_MOST_STREAMED_GAME']}`
                    );
                }

                await connection.query(
                    `INSERT INTO streamer_game
                    (streamer_game_id, streamer_id, game_id, game_role)
                    VALUES (?, ?, ?, ?)`,
                    [
                        `SG${String(id++).padStart(4, '0')}`,
                        streamerId,
                        games[0].game_id,
                        'secondary'
                    ]
                );
            }
        }

        console.log('Relaciones entre streamers y juegos cargadas correctamente');

    } catch (error) {

        console.error('Error al cargar relaciones:', error);

    } finally {

        connection.release();
        await pool.end();

    }
}

// Ejecuta carga
loadStreamerGames();
