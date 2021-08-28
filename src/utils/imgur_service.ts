// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
import axios from 'axios';

export abstract class ImgurService {
	private static readonly _AXIOS = axios.create({
		headers: {
			Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
		},
	});

	public static async upload(image: Buffer): Promise<string> {
		return ImgurService._AXIOS
			.post('https://api.imgur.com/3/image', {
				image: image.toString('base64'),
				type: 'base64',
			})
			.then(({ status, statusText, data }) => {
				if (status === 200) {
					const imgurRes: ImgurResponse = data;
					return imgurRes.data.link;
				} else {
					throw Error(`Upload failed with ${status}:${statusText}`);
				}
			});
	}
}

type ImgurResponse = {
	data: ImgurImageData;
};

type ImgurImageData = {
	account_id: number;
	account_url: string;
	ad_type: number;
	animated: boolean;
	bandwidth: number;
	datetime: number;
	deletehash: string;
	description: string;
	edited: string;
	favorite: boolean;
	has_sound: boolean;
	height: number;
	id: string;
	in_gallery: boolean;
	in_most_viral: boolean;
	is_ad: boolean;
	link: string;
	name: string;
	nsfw: unknown;
	section: unknown;
	size: number;
	tags: string[];
	type: string;
	views: number;
	vote: unknown;
	width: number;
};
