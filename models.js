"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

const token=`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IlBlcHRvQmlzbWFsIiwiaWF0IjoxNzA2MjQ5NDQyfQ.Kv7seJqjJIF_Eq8iJy-CwjfKSW0vB3C-MD0HjDYFqjM`;

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
    this.favorite = new Set();
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    const url=new URL(this.url);
    return url.hostname;
  }
  
  toggleFavorite(username) {
    this.favorite.has(username)
      ? this.favorite.delete(username)
      : this.favorite.add(username);
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }
  
  static async getFavorites() {
    // Filters all the stories on the page into just the stories that are favorited
    //  by the current user.
    const storyList = await StoryList.getStories();
    
    if (!currentUser || !currentUser.favorites) {
      return [];
    }
    
    const favoriteStories = storyList.stories.filter(story => 
      currentUser.favorites.some(favStory => favStory.storyId === story.storyId)
    );
    
    return favoriteStories;
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(user,newStory) {
    const response=await axios({
      url: `${BASE_URL}/stories`,
      method: 'POST',
      data: {
        token: user.loginToken,
        story: newStory
      }
    });

    const story=new Story(response.data.story);

    this.stories.unshift(story);

    user.ownStories.unshift(story);

    return story
  }
  
}


/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });
  
    let { user } = response.data;
  
    let loggedInUser = new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  
    return loggedInUser;
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }
  async addFavorite(storyId) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
        method: 'POST',
        data: {
          token: this.loginToken
        }
      });
  
      // Update the user's favorites
      const story = response.data.user.favorites.find(s => s.storyId === storyId);
      this.favorites.push(story);
    } catch (err) {
      console.error("addFavorite failed", err);
    }
  }
  
  async removeFavorite(storyId) {
    try {
      await axios({
        url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
        method: 'DELETE',
        data: {
          token: this.loginToken
        }
      });
  
      // Update the user's favorites
      this.favorites = this.favorites.filter(s => s.storyId !== storyId);
    } catch (err) {
      console.error("removeFavorite failed", err);
    }
  }
  async getFavorites() {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${this.username}`,
        method: 'GET',
        params: { token: this.loginToken }
      });
  
      // Update the user's favorites
      this.favorites = response.data.user.favorites;
    } catch (err) {
      console.error("getFavorites failed", err);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

async function postStory(){
  const storyURL=`${BASE_URL}/stories`;
  const data={
    token: token,
    story: {
      author: 'Elie Schoppik',
      title: 'Four Tips for Moving Faster as a Developer',
      url: 'https://www.rithmschool.com/blog/developer-productivity'
    }
  };
  try{
    const response=await axios.post(storyURL,data);
    console.log(response.data);
  }catch(error){
    console.error(error);
  }
}
