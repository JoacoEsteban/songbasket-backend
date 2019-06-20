# Spotify API Wrapper
Simple API Wrapper that removes the need of getting an Authentication Token in order to access the Spotify API.
There's also an interface if you have to do a quick check.

All responses are returned in **JSON** Format.

## Get an Artist
`https://spotify-api-wrapper-joaco.herokuapp.com/artist/'your-artist-name'` <br>
**Example**:
[spotify-api-wrapper-joaco.herokuapp.com/artist/Boris Brejcha](https://spotify-api-wrapper-joaco.herokuapp.com/artist/Boris%20Brejcha)

## Get an Artist's Top 10 Tracks
`https://spotify-api-wrapper-joaco.herokuapp.com/artist/'your-artist-id'/top-tracks` <br>
**Example**:
[spotify-api-wrapper-joaco.herokuapp.com/artist/6caPJFLv1wesmM7gwK1ACy/top-tracks](https://spotify-api-wrapper-joaco.herokuapp.com/artist/6caPJFLv1wesmM7gwK1ACy/top-tracks)

## Get **BOTH** an Artist and it's Top 10 Tracks
`https://spotify-api-wrapper-joaco.herokuapp.com/artist-with-tracks/'your-artist-name'` <br>
**Example**:
[spotify-api-wrapper-joaco.herokuapp.com/artist/Boris Brejcha](https://spotify-api-wrapper-joaco.herokuapp.com/artist-with-tracks/Boris%20Brejcha)

---
Check it out at [spotify-api-wrapper-joaco.herokuapp.com](https://spotify-api-wrapper-joaco.herokuapp.com/)