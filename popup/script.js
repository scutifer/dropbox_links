function getPosition(element) {
    var xPosition = 0;
    var yPosition = 0;
  
    while(element) {
        xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
        yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
        element = element.offsetParent;
    }
    return { x: xPosition, y: yPosition };
}

function getLink(linkUrl, linkTitle) {
    var linkTemplate = '<li><a href="$LINK">$TITLE</a></li>';
    return linkTemplate.replace('$LINK', linkUrl).replace('$TITLE', linkTitle);
}

function updateLinkHref(href, tag) {
    document.getElementById('linkhref').innerHTML = href;
    var linkStyle = document.getElementById('linkhref-container').style;
    var linkC = document.getElementById('linkhref-container');

    if(href != '')
        linkStyle.display = 'block';
    else
        linkStyle.display = 'none';
    
    if(tag) {
        var top = getPosition(tag).y + tag.offsetHeight;
        if(top > (window.innerHeight - linkC.offsetHeight)) {
            top = getPosition(tag).y - linkC.offsetHeight - 10;
            document.getElementById('downarrow').style.display = 'block';
            document.getElementById('uparrow').style.display = 'none';
        } else {
            document.getElementById('downarrow').style.display = 'none';
            document.getElementById('uparrow').style.display = 'block';
        }
        linkStyle.top = top + 'px';
    } else {
        linkStyle.top = '0px';
        document.getElementById('downarrow').style.display = 'none';
        document.getElementById('uparrow').style.display = 'none';
    }
}

function updateUI(linkTuples) { 
    var linkList = document.getElementById('linkList');
    linkList.innerHTML = '';

    if(linkTuples == '') {
        linkList.innerHTML = '<span>No links available. Put some links in the <b>/Apps/Drafts/links.txt</b> file in your Dropbox</span>';
        return;
    }

    linkTuples.forEach(function(linkTuple) {
        linkList.innerHTML += getLink(linkTuple[0], linkTuple[1]);
    });

    [].forEach.call(document.getElementsByTagName('a'), function(aTag) {
        aTag.addEventListener('click', function(event) {
            chrome.tabs.create({
                url: event.target.href
            });
            chrome.runtime.sendMessage({
                type: 'db-remove',
                data: [aTag.href, aTag.innerText]
            });
            setTimeout(refreshData, 1000);
        });
        aTag.addEventListener('mouseover', function(event) {
            updateLinkHref(event.target.href, event.target);
        });
        aTag.addEventListener('mouseout', function(event) {
            updateLinkHref('');
        });
    });
}

chrome.runtime.onMessage.addListener(function(message) {
    if(message.type == 'ui-data') {
        console.log('got data ->', message.data);
        updateUI(message.data);
        refreshDone = true;
    } else if(message.type == 'db-error')
        updateLinkHref(message.data);
        setTimeout(updateLinkHref, 3000, '');
});

chrome.runtime.sendMessage({
    type: 'dropbox-action',
    data: 'data-request' 
});

var refreshDone = true;
function refreshData() {
    chrome.runtime.sendMessage({
        type: 'dropbox-action',
        data: 'data-refresh' 
    });
    updateLinkHref('Refreshing data...');
    refreshDone = false;
    window.refreshUITimer = setInterval(function() { 
        if(refreshDone) {
            updateLinkHref('');
            clearInterval(window.refreshUITimer);
        }
    }, 500);
}

document.getElementById('refresh-list').addEventListener('click', refreshData);
