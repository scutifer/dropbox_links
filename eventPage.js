function sendMessageToPopup(message) {
    chrome.runtime.sendMessage({
        type: 'ui-data',
        data: message
    });
}

function sendErrorToPopup(error) {
    chrome.runtime.sendMessage({
        type: 'db-error',
        data: error,
    });
}

function initializeDropbox(authSuccessCallback) {
    var client = new Dropbox.Client({ key: 'YOUR_DROPBOX_APP_KEY' });
    client.authDriver(new Dropbox.AuthDriver.ChromeExtension({
        receiverPath: 'dropbox_oauth_receiver.html'
    }));
    client.authenticate(function(error, client) {
        if(error) {
           return handleDropboxError(error);
        }
        registerFileHandlers(client);
        authSuccessCallback();
    });
}

var dbReturnedError = false;
var dbError;
function handleDropboxError(errorObject) {
    var errorText;
    function localLog(x) { errorText = x; console.log(x); }
    switch (errorObject.status) {
        case Dropbox.ApiError.INVALID_TOKEN:
        // the user token expired.
        // Get the user through the authentication flow again.
        localLog('INVALID_TOKEN');
        break;

        case Dropbox.ApiError.NOT_FOUND:
        // The file or folder you tried to access is not in the user's Dropbox.
        // Handling this error is specific to your application.
        localLog('The file or folder was not found in your Dropbox');
        break;

        case Dropbox.ApiError.OVER_QUOTA:
        // The user is over their Dropbox quota.
        // Tell them their Dropbox is full. Refreshing the page won't help.
        localLog('Your Dropbox is full');
        break;

        case Dropbox.ApiError.RATE_LIMITED:
        // Too many API requests. Tell the user to try again later.
        // Long-term, optimize your code to use fewer API calls.
        localLog('Too many requests. Wait a while before you refresh again');
        break;

        case Dropbox.ApiError.NETWORK_ERROR:
        // An error occurred at the XMLHttpRequest layer.
        // Most likely, the user's network connection is down.
        // API calls will not succeed until the user gets back online.
        localLog('You\'re not connected to the Internet');
        break;

        case Dropbox.ApiError.INVALID_PARAM:
        case Dropbox.ApiError.OAUTH_ERROR:
        case Dropbox.ApiError.INVALID_METHOD:
        default:
        localLog('ERROR ' + errorObject);
        // Caused by a bug in dropbox.js, in your application, or in Dropbox.
        // Tell the user an error occurred, ask them to refresh the page.
    }

    chrome.browserAction.setBadgeText({
        text: '?'
    });
   
    dbReturnedError = true;
    dbError = errorText;
    sendErrorToPopup(errorText);
}

function registerFileHandlers(dropboxClient) {
    var syncFile = '/Apps/Drafts/links.txt';

    window.writeToFile = function(textToWrite) {
        dropboxClient.writeFile(syncFile, textToWrite, function(error, stat) {
            if (error) {
                return handleDropboxError(error);
            }
        });
    }

    window.readFromFile = function(callback) {
        dropboxClient.readFile(syncFile, function(error, fileContents) {
            if (error) {
                console.log('DB readFile error', error);
                return handleDropboxError(error);
            }
            callback(fileContents);
        });
    }
}

function stringToTuple(data) {
    var linkTuples = data.split('\n').map(function(tuple) { 
        var i = tuple.indexOf(','),
            link = tuple.substring(0, i), 
            title = tuple.substring(i+1, tuple.length);
        return [link || tuple, title || link];
    });
    return linkTuples;
}

function sendLinksToPopup() {
    chrome.storage.sync.get('fileData', function (data) {
        if(!data.fileData || (data.fileData == ''))
            var linkTuples = '';
        else
            var linkTuples = stringToTuple(data.fileData);
        sendMessageToPopup(linkTuples);
        if(dbReturnedError)
            sendErrorToPopup(dbError);
    });
}

function getLinksFromFile(callback) {
    readFromFile(function readSuccess(data) {
        data = data.trim();
        var linkTuples = stringToTuple(data);
        chrome.browserAction.setBadgeText({
            text: (data == '') ? '0' : linkTuples.length.toString()
        });
        chrome.storage.sync.set({
            fileData: data
        });
        if(callback)
            callback();
    });
}

initializeDropbox(getLinksFromFile);

chrome.runtime.onMessage.addListener(function(message) {
    console.log('got request ->', message.type, '; data ->', message.data);
    if(message.type == 'dropbox-action')
        switch(message.data) {
            case 'data-request':
                sendLinksToPopup();
                break;
            case 'data-refresh':
                getLinksFromFile(sendLinksToPopup);
                break;
        }
    else if(message.type == 'db-remove') {
        var recvdTuple = message.data[0] + ',' + message.data[1];
        chrome.storage.sync.get('fileData', function (data){
            console.log('fileData.split');
            var linkTuples = data.fileData.split('\n');
            console.log('fileData.split: done');
            var updatedTuples = [];
            linkTuples.forEach(function(tuple) {
                if(tuple != recvdTuple)
                    updatedTuples.push(tuple);
            });
            writeToFile(updatedTuples.join('\n'));
        });
    }
});

/* Hourly refresh daemon */
var dataRefreshTimer = setInterval(getLinksFromFile, 1000*60*60, sendLinksToPopup);
