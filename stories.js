"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();
  return $(`
      <li id="${story.storyId}">
        <div class="story-container">
          <div class="favorite-check" title="Add to Favorites">&#9734;</div>
          <div class="story-details">
            <div class="story-header">
              <a href="${story.url}" target="a_blank" class="story-link">
                ${story.title}
              </a>
              <small class="story-hostname">(${hostName})</small>
            </div>
            <small class="story-author">by ${story.author}</small>
            <small class="story-user">posted by ${story.username}</small>
          </div>
        </div>
      </li>
    `);
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

async function submitStory(e){
  e.preventDefault();
  let title=$('#submit-title').val();
  let author=$('#submit-author').val();
  let url=$('#submit-url').val();
  const newStory=await storyList.addStory(currentUser,{title,author,url});
  const $story=generateStoryMarkup(newStory);
  $allStoriesList.prepend($story);
  $(`#submit-title`).val('');
  $(`#submit-author`).val('');
  $(`#submit-url`).val('');
  hidePageComponents();
  $allStoriesList.show();
}
$submitForm.on('submit',submitStory);