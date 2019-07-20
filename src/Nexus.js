const { DB } = require('./DB')

module.exports = {
    Nexus: {
        checkUserAndUpdateWrapper: (SBID, Wrapper) => {
            return new Promise((resolve, reject) => {

                user = DB.getUserFromSBID(SBID); //Gets user from DB
                if (user === null) {
                    reject()
                    
                };

                Wrapper.setAccessToken(user.access_token);
                Wrapper.setRefreshToken(user.refresh_token);

                if (!(Date.now() - user.token_created_at < 3540 * 1000)) {
                    //Retrieve NEW Access Token
                    Wrapper.refreshAccessToken().then(
                        function (data) {
                            console.log('The access token has been refreshed!', data);

                            user.access_token = data.access_token;

                            DB.updateToken(SBID, user.access_token);
                            Wrapper.setAccessToken(user.access_token);

                            resolve(user.access_token)
                        },
                        function (err) {
                            console.log('Could not refresh access token', err);
                            reject()
                        }
                    );

                } else resolve(user.access_token)

            })
        }
    }
}