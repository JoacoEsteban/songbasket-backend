module.exports = {
  youtubeVideoId: /(https:\/\/www.youtube.com.watch\?v=)?([a-zA-Z0-9-_]{11})/,
  spotifyPlaylistId: (txt) => txt.length === 22 && /[a-zA-Z0-9]{22}/.test(txt),
  spotifyUserId: (txt) => /[a-zA-Z0-9\._]+/.test(txt),
  spotifySnapshotId: (txt) => txt.length === 60 && /[a-zA-Z0-9+/=]{60}/.test(txt)
}