// this houses all the articles after a mood exists
import React from 'react';
import { fetchComments, postComment } from '../dbModels/comments.js'
import { ModalContainer, ModalDialog } from 'react-modal-dialog';
import { fetchAllArticles, fetchAllSources, fetchVoice } from '../models/articles.js';
import UserControls from './UserControls.js';
import Watson from 'watson-developer-cloud'
import Sentiment from 'sentiment';
import * as Logo from '../models/sourceLogo.js'

export default class ArticleList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      articles: [],
      mood: 'good',
      showComments: false
    };
  }
  onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }
  componentWillMount() {
    this.getSources()
  }
  getArticles(source) {
    console.log("testing")
    fetchAllArticles(source.id).then((x)=> {
      x.articles = x.articles.map((article) => {
        article.source = x.source;
        var result = Sentiment(article.title);
        article.sentimentScore = result.score;
        article.sentimentComparative = result.comparative;
        return article;
      })
      this.setState({ articles: this.state.articles.concat(x.articles) })
    }) 
  }
  removeDuplicates(array) {
    array.filter(this.onlyUnique)
  }
  getSources() {
    fetchAllSources()
    .then(source => source.forEach(source => {
      if(source.id !== 'buzzfeed' && source.id !== 'redditrall') {
        this.getArticles(source)
      }
    }))
  }
  openComments(title) {
    console.log('opening comments')
    this.setState({articleTitle: title})
    fetchComments(title)
    .then(comments => {
      this.setState({comments: comments})
      this.setState({showComments: true});
      console.log('showing comments modal', this.state.showComments)
    })
  }
  closeComments() {
    this.setState({showComments: false})
  }
  textToSpeech(words) {
    fetchVoice(words).then(something => {
      var audio = new Audio('textToSpeech.wav');
      audio.play();
    })
  }
  changeMood(mood) {
    this.setState({mood: mood})
  }

  renderArticles(articles) {
    // sorts articles by emotion score by what the current mood is.
    if(this.state.mood){
      var sortObject = {
        'good': [-1, 1],
        'bad': [1, -1]
      };
      articles.sort((a, b) => {
        if(a.sentimentScore > b.sentimentScore) return sortObject[this.state.mood][0];
        else if(b.sentimentScore > a.sentimentScore) return sortObject[this.state.mood][1];
        else return 0;
      })
    }

    // Returning article elements to be displayed
    return articles.map((article) => {
      return (
        <div key={this.state.articles.indexOf(article)} className="photo-box u-1 u-med-1-3 u-lrg-1-4">
          <div>
            <img className="article" src={article.urlToImage} />
            <aside className="photo-box-caption">
              <img className="source-image" src={Logo.findSourceLogo(article.source)} />
              <p onClick={this.textToSpeech.bind(null, article.description)}> { article.title } - <a href={article.url} target="_blank">Full article</a></p>
              <a href="javascript:void(0)" onClick={e => this.openComments(article.title)}>Comments!</a>
            </aside>
          </div>
        </div>
      )
    })
  }

  render() {
    // show all articles for the given time period (eg. today) filtered for the mood variable in the app component
    return (
      <div className="pure-g">
        <div className="splash-container">
          <h1 className="splash-head">Have You Heard The News</h1>
          <p  className="splash-subhead">Click source logo to hear the article</p>
          <UserControls getArticles={this.getArticles.bind(this)} articles={this.state.articles} changeMood={this.changeMood.bind(this)}/>
        </div> 
        {this.state.showComments ? 
          <Comments onClose={this.closeComments.bind(this)} title={this.state.articleTitle} comments={this.state.comments}/>
          :
          null}
        <div className="content-wrapper" >
        {this.renderArticles(this.state.articles)}
        </div>
      </div>
    )
  }
}

class Comments extends React.Component {
  constructor() {
    super()
  }
  submitComment(){
    let title = this.props.title;
    let username = this.state.username;
    let msg = this.state.msg;
    postComment(title, username, msg)
    .then(resp => {
      console.log('yay we added a comment... resp: ', resp)
    })
  }

  render() {

    return (
      <ModalContainer onClose={this.props.onClose}>
        <ModalDialog onClose={this.props.onClose} className='comments'>
          <h2>{this.props.title}</h2>
          { this.props.comments
            .map(comment => {
              return (
                <div className='single_comment'>
                <p>{comment.username}</p>
                <p>{comment.msg}</p>
                </div>
                )
            })
          }
          <form name="newComment" onSubmit={e => {
            e.preventDefault();
            this.submitComment()
          }}>

          <div> <input type='text' placeholder='name' name="username" onChange={e => this.setState({username: e.target.value})}/> </div>
          <div> <input type='text' className='comment-box' placeholder='Enter your comment here' name="msg" onChange={e => this.setState({msg: e.target.value})}/> </div>
            <button className="pure-button pure-button-primary" type='submit'>Submit</button>

          </form>
        </ModalDialog>
      </ModalContainer>
      )
  }
}
