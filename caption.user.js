// ==UserScript==
// @name         Panopto Caption
// @namespace    https://github.com/BlazerYoo/
// @version      0.1
// @description  Extract captions from Panopto video
// @author       BlazerYoo
// @match        https://princeton.hosted.panopto.com/Panopto/Pages/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=panopto.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('----------------PANOPTO CAPTION EXTRACTION: PCE----------------');

    // Extract time stamp
    function extractTime(timeString, hour, minute, seconds) {
        const timeComponents = timeString.split(':');
        if (timeComponents.length === 2) {
            minute = parseInt(timeComponents[0]);
            seconds = parseInt(timeComponents[1]);
        } else if (timeComponents.length === 3) {
            hour = parseInt(timeComponents[0]);
            minute = parseInt(timeComponents[1]);
            seconds = parseInt(timeComponents[2]);
        }
        return [hour, minute, seconds];
    }

    // Format time stamp
    function formatTime(hour, minute, seconds) {
        return [
            hour.toString().padStart(2, '0'),
            minute.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    }

    // Wait for captions to fully load
    function waitForCaptions(querySelector, callback) {
        const observer = new MutationObserver((mutationList, obs) => {
            if (document.querySelector(querySelector)) {
                obs.disconnect();
                setTimeout(callback, 3000);
                return;
            } else {
                console.log('PCE: captions not found yet...');
            }
        });
        observer.observe(document, {
            attributes: true,
            childList: true,
            subtree: true
        });
    }

    waitForCaptions("#transcriptTabPane > div.event-tab-scroll-pane > ul", () => {
        console.log('PCE: captions found!');
        console.log(`PCE: caption length: ${document.querySelector("#transcriptTabPane > div.event-tab-scroll-pane > ul").children.length}`);

        let captionString = '';
        let captionHour = 0;
        let captionMinute = 0;
        let captionSeconds = 0;
        const captionHTMLElements = document.querySelector("#transcriptTabPane > div.event-tab-scroll-pane > ul").children;


        // Generate full caption string
        for (let i = 0; i < captionHTMLElements.length; i++) {

            // Add caption index
            captionString += i + 1 + '\n';

            // Extract caption start time
            const captionTime = captionHTMLElements[i].children[1].children[2].innerText;
            [captionHour, captionMinute, captionSeconds] = extractTime(captionTime, captionHour, captionMinute, captionSeconds);

            // Format + add start time
            let formattedTime = formatTime(captionHour, captionMinute, captionSeconds);
            captionString += formattedTime + ',000 --> ';

            if (i === captionHTMLElements.length - 1) {
                // Get end of video time for last caption
                let videoEndHour = 0;
                let videoEndMinute = 0;
                let videoEndSeconds = 0;

                const timeElapsed = document.getElementById('timeElapsed').innerText;
                [videoEndHour, videoEndMinute, videoEndSeconds] = extractTime(timeElapsed, videoEndHour, videoEndMinute, videoEndSeconds);

                const timeRemaining = document.getElementById('timeRemaining').innerText.slice(1);
                const timeRemainingComponents = timeRemaining.split(':');
                if (timeRemainingComponents.length === 2) {
                    videoEndMinute += parseInt(timeRemainingComponents[0]);
                    videoEndSeconds += parseInt(timeRemainingComponents[1]);
                } else if (timeRemainingComponents.length === 3) {
                    videoEndHour += parseInt(timeRemainingComponents[0]);
                    videoEndMinute += parseInt(timeRemainingComponents[1]);
                    videoEndSeconds += parseInt(timeRemainingComponents[2]);
                }

                // Correct format to standard time units
                const adjustedSeconds = videoEndSeconds % 60;
                const adjustedMinute = (videoEndMinute + Math.floor(videoEndSeconds / 60)) % 60;
                const adjustedHour = videoEndHour + Math.floor((videoEndMinute + Math.floor(videoEndSeconds / 60)) / 60);

                // Format + add video end time
                formattedTime = formatTime(adjustedHour, adjustedMinute, adjustedSeconds);;
                captionString += formattedTime + ',000\n';

            } else {
                // Extract caption end time for non-last captions
                const captionTime = captionHTMLElements[i+1].children[1].children[2].innerText;
                [captionHour, captionMinute, captionSeconds] = extractTime(captionTime, captionHour, captionMinute, captionSeconds);

                // Format + add end time
                formattedTime = formatTime(captionHour, captionMinute, captionSeconds);
                captionString += formattedTime + ',000\n';
            }

            // Extract + add caption text
            const captionText = captionHTMLElements[i].children[1].children[1].innerText;
            captionString += captionText.trim() + '\n\n';
        }
        console.log(captionString);

        // Create caption file url
        let textFile = null;
        const data = new Blob([captionString], {type: 'text/plain'});
        textFile = URL.createObjectURL(data);

        // Download caption file
        const downloadCaption = document.createElement('a');
        downloadCaption.href = textFile;
        downloadCaption.download = document.getElementsByTagName('title')[0].innerText + '.srt';
        downloadCaption.click();
        URL.revokeObjectURL(textFile);
    });
})();
