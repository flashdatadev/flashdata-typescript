import { FlashData, type Source, type RealtimeQuery } from '../src/index.js';
const client = new FlashData({apiKey: 'test'});
const source: Source = 'google_search';
const query: RealtimeQuery = {source, query: 'coffee', params: {autocorrect: false}};
void query;
void client.youtube.transcript({video_id: 'dQw4w9WgXcQ', auto: false});
// @ts-expect-error max_results is a number
void client.youtube.search({query: 'coffee', max_results: '10'});
// @ts-expect-error typo in source
const bad: Source = 'google_seach';
// @ts-expect-error download is not a realtime source
const download: RealtimeQuery = {source: 'youtube_download', video_id: 'dQw4w9WgXcQ'};
void bad; void download;
