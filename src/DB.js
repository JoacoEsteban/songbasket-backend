const uuid = require('uuid/v4');

var DATA_BASE = new Array();

// ::::::::::::::USER OBJECT::::::::::::::
// {
//     user_id
//     access_token
//     refresh_token
//     SBID
//     token_created_at
// }

function isNullOrUndefined(x) {return x === null || x === undefined}


function getUserIndexFromSBID(SBID)
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
function getUserIndexFromUserID(user_id)
{
    for(let i = 0; i < DATA_BASE.length; i++)
    {
        if(DATA_BASE[i].user_id === user_id)
        {
            return i;
        }
    }
    return -1; //Not Found
}

exports.DB = {

    publish(newUser) //Recieves an Object with the User ID and Refresh and Access Tokens. SBID Is Created here for new users and returned
    {
        var userIndex = getUserIndexFromUserID(newUser.user_id);

        if(userIndex === -1) //If user isn't in the DB create a SBID and Store it
        {
            newUser.SBID = uuid();
            
            DATA_BASE.push(newUser);
            console.log('DATABASE::::::::::::::::', DATA_BASE[DATA_BASE.length - 1])

            return newUser.SBID;
        }else
        { //Overwrites with new data
            newUser.SBID = isNullOrUndefined(DATA_BASE[userIndex].SBID) ? uuid() : DATA_BASE[userIndex].SBID ;

            DATA_BASE[userIndex] = newUser;
            console.log('USER EXISTS, OVERWRITTEN WITH NEW DATA::::::::::::::::', DATA_BASE[userIndex]);
            
            return newUser.SBID;
        }
    },








    
    //Get User
    getUserFromUserID(user_id)
    {
        index = getUserIndexFromUserID(user_id);
        return index === -1 ? null : DATA_BASE[index];
    },

    getUserFromSBID(SBID)
    {
        index = getUserIndexFromSBID(SBID);
        return index === -1 ? null : DATA_BASE[index];
    },










    updateToken(SBID, token)
    {
        var userIndex = getUserIndexFromSBID(SBID);
        
        if(userIndex === -1 )
        {
            console.error('ERROR WHILE UPDATING USER TOKEN: USER NOT FOUND')
        }else DATA_BASE[userIndex].access_token = token; //Updates token from database
    }

}