import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import path from 'path';

// Define response types
interface Word {
    word: string;
    start: number;
    end: number;
    probability: number;
}

interface Segment {
    start: number;
    end: number;
    text: string;
    words: Word[];
}

interface AlignmentResponse {
    alignment: {
        segments: Segment[];
    };
}

// Function to check if a word is speech-able (not only special characters)
const isSpeechable = (word: string): boolean => {
    let speechable = !/^[^a-zA-Z0-9]+$/.test(word); // Returns true if the word has letters/numbers
    if (!speechable) {
        console.log('!isSpeechable', {word})
    }

    return speechable;
};

async function uploadAudio(): Promise<void> {
    const form = new FormData();

    const audioPath = ('./test_audio/audio.mp3');
    const textPath = ('./test_audio/text.txt');

    if (!fs.existsSync(audioPath) || !fs.existsSync(textPath)) {
        console.error('Error: One or both files are missing.');
        return;
    }

    form.append('audio_file', fs.createReadStream(audioPath));
    form.append('text', fs.createReadStream(textPath));

    try {
        const response = await axios.post<AlignmentResponse>('http://localhost:5000/align', form, {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data',
            },
        });

        const segments = response.data.alignment.segments;

        // Validate probability check for speech-able words
        segments.forEach((segment, index) => {
            const speechableWords = segment.words.filter(word => isSpeechable(word.word));
            const probabilities = speechableWords.map(word => word.probability);

            if (probabilities.length === 0) {
                console.warn(`Segment ${index} has no speech-able words, skipping.`);
                throw new Error("")
            }

            const avgProbability = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;

            if (avgProbability <= 0.2) {
                console.log(JSON.stringify(segment, null, 2))
                throw new Error(`Segment ${index} has an average probability of ${avgProbability}, which is too low.`);
            }
        });

        console.log('All segments passed the probability check!');
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.error('Error Response:', error.response.data);
            } else if (error.request) {
                console.error('No response received:', error.request);
            }
        } else {
            console.error('Unexpected Error:', (error as Error).message);
        }
    }
}

uploadAudio().catch(console.log);
