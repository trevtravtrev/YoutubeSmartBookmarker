let lastTimestamp = 0;

// Get video ID from URL
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  console.log(`Content: Video ID: ${videoId}`);
  return videoId;
}

// Get cleaned-up video title
function getTitle() {
  const title = document.title.replace(" - YouTube", "");
  console.log(`Content: Title: "${title}"`);
  return title;
}

// Get current timestamp from displayed time
function getTimestamp() {
  const timeDisplay = document.querySelector('.ytp-time-current');
  let timestamp = 0;
  if (timeDisplay && timeDisplay.textContent) {
    const timeParts = timeDisplay.textContent.split(':').map(part => parseInt(part, 10) || 0);
    if (timeParts.length === 3) {
      // Format: HH:MM:SS
      const [hours, minutes, seconds] = timeParts;
      timestamp = hours * 3600 + minutes * 60 + seconds;
      console.log(`Content: Timestamp from display (HH:MM:SS): ${hours}h ${minutes}m ${seconds}s = ${timestamp}s`);
    } else if (timeParts.length === 2) {
      // Format: MM:SS
      const [minutes, seconds] = timeParts;
      timestamp = minutes * 60 + seconds;
      console.log(`Content: Timestamp from display (MM:SS): ${minutes}m ${seconds}s = ${timestamp}s`);
    } else {
      console.log('Content: Invalid time display format');
    }
  } else {
    console.log('Content: Time display element not found');
    // Fallback to video element
    const video = document.querySelector('.video-stream.html5-main-video');
    if (video && typeof video.currentTime === 'number' && !isNaN(video.currentTime)) {
      timestamp = video.currentTime;
      console.log(`Content: Fallback to video currentTime: ${timestamp}s`);
    }
  }
  return timestamp;
}

// Wait for player and track timestamp
function setupTimestampTracking() {
  const timeDisplay = document.querySelector('.ytp-time-current');
  if (timeDisplay) {
    console.log('Content: Time display found');
    // Update lastTimestamp every 500ms
    setInterval(() => {
      lastTimestamp = getTimestamp();
      console.log(`Content: Updated lastTimestamp to ${lastTimestamp}`);
      const videoId = getVideoId();
      const title = getTitle();
      if (videoId && lastTimestamp >= 0) {
        chrome.runtime.sendMessage({
          action: 'updateTimestamp',
          videoId: videoId,
          timestamp: lastTimestamp,
          title: title
        });
      }
    }, 500);
    // Set initial timestamp
    lastTimestamp = getTimestamp();
    console.log(`Content: Initial timestamp: ${lastTimestamp}`);
    const videoId = getVideoId();
    const title = getTitle();
    if (videoId && lastTimestamp >= 0) {
      chrome.runtime.sendMessage({
        action: 'updateTimestamp',
        videoId: videoId,
        timestamp: lastTimestamp,
        title: title
      });
    }
    return true;
  }
  console.log('Content: Time display not found, retrying...');
  return false;
}

// Keep trying to find time display
function waitForPlayer() {
  if (!setupTimestampTracking()) {
    setTimeout(waitForPlayer, 100);
  }
}
waitForPlayer();

// Send final timestamp on tab closure
window.addEventListener('beforeunload', () => {
  const videoId = getVideoId();
  const title = getTitle();
  lastTimestamp = getTimestamp();
  console.log(`Content: Sending final timestamp ${lastTimestamp} for video ${videoId} on beforeunload`);
  if (videoId && lastTimestamp >= 0) {
    chrome.runtime.sendMessage({
      action: 'updateTimestamp',
      videoId: videoId,
      timestamp: lastTimestamp,
      title: title
    });
  } else {
    console.log('Content: Cannot send bookmark; invalid videoId or timestamp');
  }
});