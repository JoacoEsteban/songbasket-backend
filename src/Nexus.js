const { DB } = require('./DB')

module.exports = {
    Nexus:{
        checkUserAndUpdateWrapper: (SBID, Wrapper, pass, reject) =>
        {
            user = DB.getUserFromSBID(requestParams.SBID); //Gets user from DB
            if (user === null) {
                reject();
                return;
            };

            Wrapper.setAccessToken(user.access_token);
		    Wrapper.setRefreshToken(user.refresh_token);
            
            if (!(Date.now() - user.token_created_at < 3600 * 1000)) 
            {
                //Retrieve NEW Access Token
                //TODO Build RefreshAccessToken Function
                Wrapper.refreshAccessToken().then(
                    function (data) {
                        console.log('The access token has been refreshed!');
    
                        loggedToken = data.body['access_token'];
    
                        DB.updateToken(SBID, loggedToken);
                        Wrapper.setAccessToken(loggedToken);
    
                        retrieveRedirect(res, requestParams, loggedToken)
                    },
                    function (err) {
                        console.log('Could not refresh access token', err);
                    }
                );
            }

        }
    }
}