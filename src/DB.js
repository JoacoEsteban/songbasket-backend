var DATA_BASE = new Array();

exports.DB = {

    getUserIndex(user_id)
    {
        for(let i = 0; i < DATA_BASE.length; i++)
        {
            if(DATA_BASE[i].user_id === user_id)
            {
                return i;
            }
        }
        return -1; //Not Found
    },

    publish(newUser)
    {
        var userIndex = this.getUserIndex(newUser.user_id);

        if(userIndex === -1) //If user isn't in the DB
        {
            DATA_BASE.push(newUser);
            console.log('DATABASE::::::::::::::::', DATA_BASE[DATA_BASE.length - 1])
        }else
        { //Overwrites with new data
            DATA_BASE[userIndex] = newUser;
            console.log('EXISTS, OVERWRITING WITH NEW DATA::::::::::::::::', DATA_BASE[userIndex])
        }
    },

    updateToken(userIndex, token)
    {
        DATA_BASE[userIndex].access_token = token; //Updates token from database
        
        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(token);

    },

    getUserFromId(user_id)
    {
        index = this.getUserIndex(user_id);
        return index === -1 ? null : DATA_BASE[index];
    },

    updateToken(user_id, token)
    {
        var userIndex = this.getUserIndex(user_id);
        
        if(userIndex === -1 )
        {

        }else{
            DATA_BASE[userIndex].access_token = token; //Updates token from database

        }
    }

}