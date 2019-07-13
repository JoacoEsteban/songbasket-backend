var DATA_BASE = new Array();

function getUserIndex(SBID)
{
    for(let i = 0; i < DATA_BASE.length; i++)
    {
        if(DATA_BASE[i].SBID === SBID)
        {
            return i;
        }
    }
    return -1; //Not Found
}

exports.DB = {


    publish(newUser)
    {
        var userIndex = getUserIndex(newUser.user_id);

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

    getUserFromSBID(SBID)
    {
        index = getUserIndex(SBID);
        return index === -1 ? null : DATA_BASE[index];
    },

    updateToken(user_id, token)
    {
        var userIndex = getUserIndex(user_id);
        
        if(userIndex === -1 )
        {

        }else{
            DATA_BASE[userIndex].access_token = token; //Updates token from database

        }
    }

}