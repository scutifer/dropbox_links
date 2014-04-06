DB Links
========

A simple Chrome Extension to view links sent from the iPhone.

![DB Links Screenshot](https://github.com/scutifer/dropbox_links/raw/master/screenshots/screenshot_1.png)

Introduction
------------
This extension is similar to myPhoneDesktop except that it pushes data in reverse -- from phone to desktop. It currently reads links from the /Apps/Drafts/links.txt file.

How To Use
----------
On the iPhone, you need to have [Drafts](http://agiletortoise.com/drafts/) installed. Then, use this bookmarklet to send the current page in Safari (or any browser) to Drafts which appends the link and the title to a file (/Apps/Drafts/links.txt) in Dropbox.

    javascript:(function() {
        var href = encodeURIComponent(location.href),
            hrefAndTitle = encodeURIComponent(location.href + ',' + document.title);
        location.href = 'drafts://x-callback-url/create?text=' + hrefAndTitle 
                        + '&action=Read%20link%20later&afterSuccess=Delete&x-success=' + href;
    })()
    
And here's the Drafts action.

    drafts://x-callback-url/import_action?type=dropbox&name=Read%20link%20later&path=%2FApps%2FDrafts%2F&filenametype=2&filename=links&ext=txt&writetype=2&template=%5B%5Bdraft%5D%5D

![Drafts Action](https://github.com/scutifer/dropbox_links/raw/master/screenshots/drafts.png)
    
License
-------
This project is licensed under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
