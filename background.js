let tabData = {};

// Store video data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateTimestamp' && sender.tab) {
    const tabId = sender.tab.id;
    tabData[tabId] = {
      videoId: message.videoId,
      timestamp: message.timestamp,
      title: message.title
    };
    console.log(`Background: Stored timestamp ${message.timestamp} for tab ${tabId}`);
  }
});

// Handle tab closure
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabData[tabId]) {
    console.log(`Background: Tab ${tabId} closed, processing bookmark with timestamp ${tabData[tabId].timestamp}`);
    createOrUpdateBookmark(tabData[tabId]);
    delete tabData[tabId];
  } else {
    console.log(`Background: No bookmark data for tab ${tabId}`);
  }
});

// Handle browser closure
chrome.runtime.onSuspend.addListener(() => {
  console.log('Background: Browser closing, processing bookmarks for all tabs');
  Object.keys(tabData).forEach(tabId => {
    if (tabData[tabId]) {
      console.log(`Background: Processing bookmark for tab ${tabId} with timestamp ${tabData[tabId].timestamp}`);
      createOrUpdateBookmark(tabData[tabId]);
      delete tabData[tabId];
    }
  });
});

// Create or update bookmark
function createOrUpdateBookmark(data) {
  const url = `https://www.youtube.com/watch?v=${data.videoId}&t=${Math.floor(data.timestamp)}s`;
  const formattedTime = formatTime(data.timestamp);
  const title = `🎥 ${data.title} @ ${formattedTime}`;
  console.log(`Background: Preparing bookmark: ${title}, URL: ${url}`);

  // Search for existing bookmarks with the same video ID in Bookmarks Bar
  chrome.bookmarks.search({ url: `*v=${data.videoId}*` }, (bookmarks) => {
    // Filter to Bookmarks Bar only
    const existingBookmarks = bookmarks.filter(bookmark => 
      bookmark.url && 
      bookmark.url.includes(`v=${data.videoId}`) && 
      bookmark.parentId === "1"
    );
    console.log(`Background: Found ${existingBookmarks.length} existing bookmarks for video ${data.videoId}`);

    // Remove all matching bookmarks
    let removalPromises = existingBookmarks.map(bookmark => {
      return new Promise((resolve) => {
        console.log(`Background: Removing bookmark ID ${bookmark.id} with title "${bookmark.title}"`);
        chrome.bookmarks.remove(bookmark.id, () => {
          if (chrome.runtime.lastError) {
            console.error(`Background: Error removing bookmark ID ${bookmark.id}: ${chrome.runtime.lastError.message}`);
          } else {
            console.log(`Background: Successfully removed bookmark ID ${bookmark.id}`);
          }
          resolve();
        });
      });
    });

    // Wait for all removals to complete
    Promise.all(removalPromises).then(() => {
      console.log('Background: All existing bookmarks removed, creating new bookmark');
      chrome.bookmarks.create({
        parentId: "1", // Bookmarks Bar
        index: 0,      // Leftmost position
        title,
        url
      }, (newBookmark) => {
        if (chrome.runtime.lastError) {
          console.error(`Background: Error creating bookmark: ${chrome.runtime.lastError.message}`);
        } else {
          console.log(`Background: Created bookmark with timestamp ${data.timestamp} at index 0`);
        }
      });
    }).catch(error => {
      console.error(`Background: Error during bookmark removal: ${error}`);
    });
  });
}

// Format timestamp as mm:ss or hh:mm:ss
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}