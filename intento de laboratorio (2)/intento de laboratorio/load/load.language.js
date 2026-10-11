
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../services/mysql.service');

// Carga de idiomas
async function loadLanguages() {

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

        // Idiomas unicos
        const languages = new Map();

        for (const row of rows) {

            if (row.LANGUAGE?.trim()) {
                const language = row.LANGUAGE.trim();
                languages.set(language.toLowerCase(), language);
            }
        }

        // Idiomas existentes
        const [existingLanguages] = await connection.query(
            'SELECT language_id, language_name FROM language'
        );

        const languageMap = new Map();

        let nextId = 1;

        for (const language of existingLanguages) {

            languageMap.set(
                language.language_name.toLowerCase(),
                language.language_id
            );

            const match = language.language_id.match(/^LAN(\d+)$/);

            if (match) {
                nextId = Math.max(nextId, Number(match[1]) + 1);
            }
        }

        // Inserta solo idiomas nuevos
        for (const [key, language] of languages) {

            if (languageMap.has(key)) {
                continue;
            }

            const languageId = `LAN${String(nextId).padStart(3, '0')}`;

            await connection.query(
                `INSERT INTO language (language_id, language_name)
                 VALUES (?, ?)`,
                [languageId, language]
            );

            languageMap.set(key, languageId);
            nextId++;
        }

        console.log('Idiomas cargados correctamente');

    } catch (error) {

        console.error('Error al cargar idiomas:', error);

    } finally {

        connection.release();
        await pool.end();

    }
}

// Ejecuta carga
loadLanguages();
