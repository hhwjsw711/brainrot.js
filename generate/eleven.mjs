import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
import transcriptFunction from './transcript.mjs';
import { writeFile } from 'fs/promises';
import { query } from './dbClient.mjs';

dotenv.config();

import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTranscriptAudio(
	local,
	topic,
	agentA,
	agentB,
	ai,
	fps,
	duration,
	background,
	music,
	videoId,
) {
	if (!local) {
		await query(
			"UPDATE `pending-videos` SET status = 'Generating transcript', progress = 0 WHERE video_id = ?",
			[videoId],
		);
	}

	let transcript = [
		{ person: 'JOE_ROGAN', line: '嘿，Jordan，今天我们来聊聊人工智能吧。你对这个话题有什么看法？', asset: 'Joe Rogan播客现场' },
		{ person: 'JORDAN_PETERSON', line: '人工智能是一个非常复杂的话题，Joe。它涉及到技术、哲学和伦理等多个层面。', asset: 'Jordan Peterson思考' },
		{ person: 'JOE_ROGAN', line: '确实，AI 似乎正在改变我们的生活方式。你认为它会给社会带来什么影响？', asset: 'AI影响社会' },
		{ person: 'JORDAN_PETERSON', line: '这是个好问题。AI 可能会带来巨大的机遇，但同时也伴随着风险。我们需要谨慎对待。', asset: 'AI机遇与风险' },
		{ person: 'JOE_ROGAN', line: '你提到了风险，能具体说说吗？', asset: 'Joe Rogan好奇表情' },
		{ person: 'JORDAN_PETERSON', line: '比如说，AI 可能会影响就业市场，改变传统的工作模式。我们需要思考如何适应这种变化。', asset: 'AI对就业的影响' },
	];

	/* let transcript = (await transcriptFunction(topic, agentA, agentB, duration))
		.transcript; */

	const audios = [];

	if (!local) {
		await query(
			"UPDATE `pending-videos` SET status = 'Fetching images', progress = 5 WHERE video_id = ?",
			[videoId],
		);
	}

	const images = [
		{
		  person: 'JOE_ROGAN',
		  line: '嘿，Jordan，今天我们来聊聊人工智能吧。你对这个话题有什么看法？',
		  asset: 'Joe Rogan播客现场',
		  link: 'https://res.cloudinary.com/dctisdduk/image/upload/v1727596313/brainrot-js/joe_rogan_podcast_te0vq8.png'
		},
		{
		  person: 'JORDAN_PETERSON',
		  line: '人工智能是一个非常复杂的话题，Joe。它涉及到技术、哲学和伦理等多个层面。',
		  asset: 'Jordan Peterson思考',
		  link: 'https://res.cloudinary.com/dctisdduk/image/upload/v1727596312/brainrot-js/jordan_peterson_thinking_ifpvue.png'
		},
		{
		  person: 'JOE_ROGAN',
		  line: '确实，AI 似乎正在改变我们的生活方式。你认为它会给社会带来什么影响？',
		  asset: 'AI影响社会',
		  link: 'https://res.cloudinary.com/dctisdduk/image/upload/v1727596313/brainrot-js/ai_impact_society_sttxa7.png'
		},
		{
		  person: 'JORDAN_PETERSON',
		  line: '这是个好问题。AI 可能会带来巨大的机遇，但同时也伴随着风险。我们需要谨慎对待。',
		  asset: 'AI机遇与风险',
		  link: 'https://res.cloudinary.com/dctisdduk/image/upload/v1727596312/brainrot-js/ai_opportunities_risks_mamelh.png'
		},
		{
		  person: 'JOE_ROGAN',
		  line: '你提到了风险，能具体说说吗？',
		  asset: 'Joe Rogan好奇表情',
		  link: 'https://res.cloudinary.com/dctisdduk/image/upload/v1727596313/brainrot-js/joe_rogan_curious_ks0rgg.png'
		},
		{
		  person: 'JORDAN_PETERSON',
		  line: '比如说，AI 可能会影响就业市场，改变传统的工作模式。我们需要思考如何适应这种变化。',
		  asset: 'AI对就业的影响',
		  link: 'https://res.cloudinary.com/dctisdduk/image/upload/v1727596312/brainrot-js/ai_impact_employment_v2tcy7.png'
		}
	];

	/* const images = await fetchValidImages(
		transcript,
		transcript.length,
		ai,
		duration,
	); */

	if (!local) {
		await query(
			"UPDATE `pending-videos` SET status = 'Generating audio', progress = 12 WHERE video_id = ?",
			[videoId],
		);
	}

	for (let i = 0; i < transcript.length; i++) {
		const person = transcript[i].person;
		const line = transcript[i].line;

		const voice_id =
			person === 'JOE_ROGAN'
				? process.env.JOE_ROGAN_VOICE_ID
				: person === 'BARACK_OBAMA'
				? process.env.BARACK_OBAMA_VOICE_ID
				: person === 'BEN_SHAPIRO'
				? process.env.BEN_SHAPIRO_VOICE_ID
				: person === 'RICK_SANCHEZ'
				? process.env.RICK_SANCHEZ_VOICE_ID
				: person === 'DONALD_TRUMP'
				? process.env.DONALD_TRUMP_VOICE_ID
				: person === 'MARK_ZUCKERBERG'
				? process.env.MARK_ZUCKERBERG_VOICE_ID
				: person === 'JOE_BIDEN'
				? process.env.JOE_BIDEN_VOICE_ID
				: person === 'LIL_YACHTY'
				? process.env.LIL_YACHTY_VOICE_ID
				: process.env.JORDAN_PETERSON_VOICE_ID;

		await generateAudio(voice_id, person, line, i);
		audios.push({
			person: person,
			audio: `public/voice/${person}-${i}.mp3`,
			index: i,
			image:
				ai && duration === 1
					? images[i].imageUrl
					: images[i]?.link || 'https://images.smart.wtf/black.png',
		});
	}

	const initialAgentName = audios[0].person;

	const contextContent = `
import { staticFile } from 'remotion';

export const music: string = ${
		music === 'NONE' ? `'NONE'` : `'/music/${music}.MP3'`
	};
export const fps = ${fps};
export const initialAgentName = '${initialAgentName}';
export const videoFileName = '/background/MINECRAFT-0.mp4';
export const subtitlesFileName = [
  ${audios
		.map(
			(entry, i) => `{
    name: '${entry.person}',
    file: staticFile('srt/${entry.person}-${i}.srt'),
    asset: '${entry.image}',
  }`,
		)
		.join(',\n  ')}
];
`;

	await writeFile('src/tmp/context.tsx', contextContent, 'utf-8');

	return { audios, transcript };
}

export async function generateAudio(voice_id, person, line, index) {
	const response = await fetch(
		`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
		{
			method: 'POST',
			headers: {
				'xi-api-key': process.env.ELEVEN_API_KEY,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model_id: 'eleven_multilingual_v2',
				text: line,
				voice_settings: {
					stability: 0.5,
					similarity_boost: 0.75,
				},
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Server responded with status code ${response.status}`);
	}

	const audioStream = fs.createWriteStream(
		`public/voice/${person}-${index}.mp3`,
	);
	response.body.pipe(audioStream);

	return new Promise((resolve, reject) => {
		audioStream.on('finish', () => {
			resolve('Audio file saved as output.mp3');
		});
		audioStream.on('error', reject);
	});
}

async function fetchValidImages(transcript, length, ai, duration) {
	if (ai && duration === 1) {
		const promises = [];

		for (let i = 0; i < length; i++) {
			promises.push(imageGeneneration(transcript[i].asset));
		}

		const aiImages = await Promise.all(promises);

		return aiImages;
	} else {
		const images = [];
		for (let i = 0; i < length; i++) {
			const imageFetch = await fetch(
				`https://www.googleapis.com/customsearch/v1?q=${encodeURI(
					transcript[i].asset,
				)}&cx=${process.env.GOOGLE_CX}&searchType=image&key=${
					process.env.GOOGLE_API_KEY
				}&num=${4}`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				},
			);
			const imageResponse = await imageFetch.json();

			// Check if the response contains 'items' and they are iterable
			if (
				!Array.isArray(imageResponse.items) ||
				imageResponse.items.length === 0
			) {
				console.log(
					'No images found or items not iterable',
					imageResponse.items,
				);
				images.push({ link: 'https://images.smart.wtf/black.png' });
				continue; // Skip to the next iteration
			}

			const validMimeTypes = ['image/png', 'image/jpeg'];
			let imageAdded = false;

			for (let image of imageResponse.items) {
				if (validMimeTypes.includes(image.mime)) {
					const isViewable = await checkImageHeaders(image.link);
					if (isViewable) {
						images.push(image);
						imageAdded = true;
						break; // Stop after adding one valid image
					}
				}
			}

			// If no valid images were added, push a default image
			if (!imageAdded) {
				images.push({ link: 'https://images.smart.wtf/black.png' });
			}
		}

		return images;
	}
}

async function checkImageHeaders(url) {
	try {
		const response = await fetch(url, { method: 'HEAD' });
		const contentType = response.headers.get('Content-Type');
		const contentDisposition = response.headers.get('Content-Disposition');

		// Check for direct image content types and absence of attachment disposition
		if (
			contentType.includes('image/png') ||
			contentType.includes('image/jpeg')
		) {
			if (!contentDisposition || !contentDisposition.includes('attachment')) {
				return true; // Image is likely viewable directly in the browser
			}
		}
	} catch (error) {
		console.error('Error checking image headers:', error);
	}
	return false;
}

const imagePrompt = async (title) => {
	try {
		const response = await openai.chat.completions.create({
			model: 'ft:gpt-3.5-turbo-1106:personal::8TEhcfKm',
			messages: [
				{
					role: 'user',
					content: title,
				},
			],
		});
		console.log('image prompt ' + response.choices[0]?.message.content);

		return response.choices[0]?.message.content;
	} catch (error) {
		console.error('Error fetching data:', error);
	}
};

const imageGeneneration = async (initialPrompt) => {
	try {
		const prompt = await imagePrompt(initialPrompt);
		const detailed8BitPreface =
			'Create an image in a detailed retro 8-bit style. The artwork should have a pixelated texture and should have vibrant coloring and scenery.';

		let fullPrompt = `${detailed8BitPreface} ${prompt} Remember, this is in retro 8-bit style`;
		fullPrompt = fullPrompt.substring(0, 900);

		const responseFetch = await openai.images.generate({
			model: 'dall-e-3',
			prompt: fullPrompt,
			n: 1,
			size: '1024x1024',
			quality: 'standard',
			style: 'vivid',
			response_format: 'url',
			user: 'user-1234',
		});

		return {
			imageUrl: responseFetch.data[0]?.url,
			initialPrompt: initialPrompt,
			prompt: prompt,
		};
	} catch (error) {
		console.error('Error generating image:', error);
		// You might want to return a default or placeholder image URL here
		return {
			imageUrl: 'https://images.smart.wtf/black.png',
			initialPrompt: initialPrompt,
			prompt: 'Error occurred during image generation',
		};
	}
};
