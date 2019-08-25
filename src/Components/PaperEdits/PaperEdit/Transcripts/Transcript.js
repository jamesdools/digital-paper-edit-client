/* eslint-disable no-undef */
import React, { Component } from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import DropdownButton from 'react-bootstrap/DropdownButton';
// import Card from 'react-bootstrap/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHighlighter,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import SearchBar from './SearchBar/index.js';
import Paragraphs from './Paragraphs/index.js';
import LabelsList from './LabelsList/index.js';
import onlyCallOnce from '../../../../Util/only-call-once/index.js';
import getTimeFromUserWordsSelection from './get-user-selection.js';
import ApiWrapper from '../../../../ApiWrapper/index.js';

// import Paragraph from './Paragraph.js';

/**
 * Makes list of unique speakers
 * from transcript.paragraphs list
 * to be used in react-select component
 *
 * TODO: decide if to move server side, and return unique list of speaker to client
 * Or if to move to separate file as util, perhaps generalise as reusable funciton?
 *
 * https://codeburst.io/javascript-array-distinct-5edc93501dc4
 */
function makeListOfUniqueSpeakers(array) {
  const result = [];
  const map = new Map();
  for (const item of array) {
    if (!map.has(item.speaker)) {
      map.set(item.speaker, true); // set any value to Map
      result.push({
        value: item.speaker,
        label: item.speaker
      });
    }
  }

  return result;
}

class Transcript extends Component {
  constructor(props) {
    super(props);
    this.videoRef = React.createRef();
    this.state = {
      // isVideoTranscriptPreviewShow: false,
      searchString: '',
      showParagraphsMatchingSearch: false,
      selectedOptionLabelSearch: false,
      selectedOptionSpeakerSearch: [],
      sentenceToSearchCSS: '',
      sentenceToSearchCSSInHighlights: '',
      annotations: [],
      isLabelsListOpen: true,
      labelsOptions: this.props.labelsOptions,
      currentTime: 0
    };
  }

  componentDidMount = () => {
    ApiWrapper.getAllAnnotations(this.props.projectId, this.props.transcriptId)
      .then(json => {
        // console.log(' ApiWrapper.getAllAnnotations', json);
        this.setState({
          annotations: json.annotations
        });
      });
  }

  onLabelCreate = (newLabel) => {
    ApiWrapper.createLabel(this.props.projectId, newLabel)
    // TODO: add error handling
      .then(json => {
        this.setState({
          labelsOptions: json.labels
        });
      });
  }

  onLabelUpdate = (updatedLabel) => {
    console.log('updatedLabel', updatedLabel);
    // TODO: PUT with API Wrapper
    ApiWrapper.updateLabel(this.props.projectId, updatedLabel.id, updatedLabel)
    // TODO: add error handling
      .then(json => {
        this.setState({
          labelsOptions: json.labels
        });
      });
  }

  onLabelDelete = (labelIid) => {
    ApiWrapper.deleteLabel(this.props.projectId, labelIid)
    // TODO: add error handling
      .then(json => {
        this.setState({
          labelsOptions: json.labels
        });
      });
  }

  // functions repeadrted from TranscriptAnnotate/index.js
  handleTimecodeClick= e => {
    if (e.target.classList.contains('timecode')) {
      const wordEl = e.target;
      this.videoRef.current.currentTime = wordEl.dataset.start;
      this.videoRef.current.play();
    }
  };

  handleWordClick = e => {
    if (e.target.className === 'words' ) {
      const wordEl = e.target;
      this.videoRef.current.currentTime = wordEl.dataset.start;
      this.videoRef.current.play();
    }
  };

  handleShowParagraphsMatchingSearch = () => {
    this.setState((state) => {
      return { showParagraphsMatchingSearch: !state.showParagraphsMatchingSearch };
    });
  }

  handleLabelsSearchChange = (selectedOptionLabelSearch) => {
    this.setState({
      selectedOptionLabelSearch
    });
  }

  handleSpeakersSearchChange = (selectedOptionSpeakerSearch) => {
    this.setState({
      selectedOptionSpeakerSearch
    });
  }

  handleSearch = (e, searchPreferences) => {
    // TODO: debounce to optimise
    if (e.target.value !== '') {
      const searchString = e.target.value;
      this.setState({ searchString: searchString.toLowerCase() });
      //  "debounce" to optimise
      onlyCallOnce(this.highlightWords (searchString), 500);
    }
    // if empty string reset
    else if (e.target.value === '') {
      this.setState({
        sentenceToSearchCSS: '',
        searchString: ''
      });
    }
  };

  highlightWords = searchString => {
    const listOfSearchWords = searchString.toLowerCase().trim().split(' ');
    const pCSS = `.paragraph[data-paragraph-text*="${ listOfSearchWords.join(' ') }"]`;

    const wordsToSearchCSS = listOfSearchWords.map((searchWord, index) => {
      let res = `${ pCSS } > div > span.words[data-text="${ searchWord
        .toLowerCase()
        .trim() }"]`;
      if (index < listOfSearchWords.length - 1) {
        res += ', ';
      }

      return res;
    });
    // Need to add an extra span to search annotation hilights
    // TODO: refactor to make more DRY
    const wordsToSearchCSSInHighlights = listOfSearchWords.map((searchWord, index) => {
      let res = `${ pCSS } > div  > span >span.words[data-text="${ searchWord
        .toLowerCase()
        .trim() }"]`;
      if (index < listOfSearchWords.length - 1) {
        res += ', ';
      }

      return res;
    });
    this.setState({
      sentenceToSearchCSS: wordsToSearchCSS.join(' '),
      sentenceToSearchCSSInHighlights: wordsToSearchCSSInHighlights.join(' ')
    });
  };

  handleCreateAnnotation = (e) => {
    const element = e.target;
    // window.element = element;
    const selection = getTimeFromUserWordsSelection();
    if (selection) {
      const { annotations } = this.state;
      selection.labelId = element.dataset.labelId;
      selection.note = '';
      const newAnnotation = selection;
      console.log('newAnnotation', newAnnotation);
      ApiWrapper.createAnnotation(this.props.projectId, this.props.transcriptId, newAnnotation)
        .then(json => {
          const newAnnotationFromServer = json.annotation;
          const newAnnotationsSet = JSON.parse(JSON.stringify(annotations));
          newAnnotationsSet.push(newAnnotationFromServer);

          this.setState( { annotations: newAnnotationsSet });
        });

    }
    else {
      alert('Select some text in the transcript to highlight ');
    }
  }

  handleDeleteAnnotation = (annotationId) => {
    const { annotations } = this.state;
    const newAnnotationsSet = annotations.filter((annotation) => {
      return annotation.id !== annotationId;
    });

    const deepCloneOfNestedObjectNewAnnotationsSet = JSON.parse(JSON.stringify(newAnnotationsSet));
    ApiWrapper.deleteAnnotation(this.props.projectId, this.props.transcriptId, annotationId)
      .then(json => {
        this.setState( { annotations: deepCloneOfNestedObjectNewAnnotationsSet });
      });
  }

  // TODO: add server side via ApiWrapper
  // similar to handleDeleteAnnotation filter to find annotation then replace text
  handleEditAnnotation = (annotationId) => {
    const { annotations } = this.state;
    const newAnnotationToEdit = annotations.find((annotation) => {
      return annotation.id === annotationId;
    });
    const newNote = prompt('Edit the text note of the annotation', newAnnotationToEdit.note);
    if (newNote) {
      newAnnotationToEdit.note = newNote;
      ApiWrapper.updateAnnotation(this.state.projectId, this.props.transcriptId, annotationId, newAnnotationToEdit)
        .then(json => {
          const newAnnotation = json.annotation;
          // updating annotations client side by removing updating one
          // and re-adding to array
          // could be refactored using `findindex`
          const newAnnotationsSet = annotations.filter((annotation) => {
            return annotation.id !== annotationId;
          });
          newAnnotationsSet.push(newAnnotation);
          this.setState( { annotations: newAnnotationsSet });
        });
    }
    else {
      alert('all good nothing changed');
    }
  }

  showLabelsReference = () => {
    // if (this.state.isShowLabelsReference) {
    //   this.props.showLabelsReference();
    //   // this.setState({
    //   //   isShowLabelsReference: false
    //   // });
    // }
    // else {
    //   this.props.showLabelsReference();
    //   // this.setState({
    //   //   isShowLabelsReference: true
    //   // });
    // }
  }

  getCurrentWordTime = () => {
    const { words } = this.props.transcript;

    const currentTime = this.state.currentTime ;
    // if (this.videoRef && this.videoRef.current && this.videoRef.current.currentTime) {
    //   currentTime = this.videoRef.current.currentTime;
    // }
    const currentWordTime = words.find((word) => {
      if (currentTime >= word.start && currentTime <= word.end ) {
        return word.start;
      }
    });
    if (currentWordTime !== undefined) {
      return currentWordTime[0];
    }

    return 0;

  }
  // eslint-disable-next-line class-methods-use-this
  render() {
    const currentWordTime = this.state.currentTime;
    const unplayedColor = 'grey';

    // Time to the nearest half second
    const time = Math.round(currentWordTime * 4.0) / 4.0;
    const highlights = (
      <style scoped>
        {`span.words[data-prev-times~="${ Math.floor(time) }"][data-transcript-id="${ this.props.transcriptId }"] { color: ${ unplayedColor } }`}
      </style>
    );

    return (
      <>

        {/* <div style={ {
          display:
          // this.state.isShowLabelsReference ?
           'block'
          //  : 'none'
          ,
          position: 'absolute',
          top: '0px',
          left: '0px',
          width: '5vw',
          height: '100vh',
          backgroundColor: 'black'
        } }>
            Test
        </div> */}
        <style scoped>
          {/* This is to style of the Paragraph component programmatically */}
          {`${ this.state.sentenceToSearchCSS } { background-color: ${ 'yellow' }; text-shadow: 0 0 0.01px black }`}
          {`${ this.state.sentenceToSearchCSSInHighlights } { background-color: ${ 'yellow' }; text-shadow: 0 0 0.01px black }`}
        </style>

        <h2
          className={ [ 'text-truncate', 'text-muted' ].join(' ') }
          title={ `Transcript Title: ${ this.props.title }` }
        >
          {/* <FontAwesomeIcon icon={ this.state.isVideoTranscriptPreviewShow === 'none' ? faEye : faEyeSlash } onClick={ this.handleVideoTranscriptPreviewDisplay }/> */}
          {this.props.title}
        </h2>

        <Card>
          <Card.Header>
            {/* // Preview video - HTML5 Video element or  @bbc/react-transcript-editor/VideoPlayer
        // Media control - HTML5 default or @bbc/react-transcript-editor/MediaPlayer
        // Search Bar - from TranscriptAnnotate component
        // Text -  from TranscriptAnnotate component */}
            <video
              src={ this.props.url }
              ref={ this.videoRef }
              onTimeUpdate={ (e) => {this.setState({ currentTime: e.target.currentTime });} }
              // onTimeUpdate={ (e) => {console.log(e.target.currentTime); } }
              style={ {
                // display: this.state.isVideoTranscriptPreviewShow,
                width: '100%',
                height:'10em',
                backgroundColor: 'black'
              } }
              controls/>
          </Card.Header>
          <Card.Header>
            <Row>
              <Col xs={ 12 } sm={ 12 } md={ 12 } lg={ 12 } xl={ 12 }>
                <ButtonGroup style={ { width: '100%' } }>
                  <Dropdown as={ ButtonGroup } style={ { width: '100%' } } >
                    <Button variant="outline-secondary" data-label-id={ 'default' } onClick={ this.handleCreateAnnotation } >
                      <FontAwesomeIcon icon={ faHighlighter } flip="horizontal"/> Highlight
                      {/* */}
                    </Button>
                    <Dropdown.Toggle split variant="outline-secondary" data-lable-id={ 0 }/>
                    <Dropdown.Menu onClick={ this.handleCreateAnnotation }>
                      {this.state.labelsOptions && this.state.labelsOptions.map((label) => {
                        return (
                          <Dropdown.Item key={ `label_id_${ label.id }` } data-label-id={ label.id } >
                            <Row data-label-id={ label.id }>
                              <Col xs={ 1 } sm={ 1 } md={ 1 } lg={ 1 } xl={ 1 } style={ { backgroundColor: label.color } } data-label-id={ label.id }></Col>
                              <Col xs={ 1 } sm={ 1 } md={ 1 } lg={ 1 } xl={ 1 } data-label-id={ label.id }>{label.label}</Col>
                            </Row>
                          </Dropdown.Item>
                        );
                      })}
                    </Dropdown.Menu>
                  </Dropdown>

                  <DropdownButton
                    drop={ 'right' }
                    as={ ButtonGroup }
                    title={ <FontAwesomeIcon icon={ faCog }/> }
                    id="bg-nested-dropdown"
                    variant='outline-secondary'
                  >
                    <LabelsList
                      isLabelsListOpen={ this.state.isLabelsListOpen }
                      labelsOptions={ this.state.labelsOptions && this.state.labelsOptions }
                      onLabelUpdate={ this.onLabelUpdate }
                      onLabelCreate={ this.onLabelCreate }
                      onLabelDelete={ this.onLabelDelete }
                    />
                  </DropdownButton>
                </ButtonGroup>
              </Col>
            </Row>
          </Card.Header>
          <SearchBar
            labelsOptions={ this.state.labelsOptions }
            speakersOptions={ this.props.transcript ? makeListOfUniqueSpeakers(this.props.transcript.paragraphs) : null }
            handleSearch={ this.handleSearch }
            handleLabelsSearchChange={ this.handleLabelsSearchChange }
            handleSpeakersSearchChange={ this.handleSpeakersSearchChange }
            handleShowParagraphsMatchingSearch={ this.handleShowParagraphsMatchingSearch }
          />

          <Card.Body
            onDoubleClick={ this.handleWordClick }
            onClick={ this.handleTimecodeClick }
            style={ { height: '60vh', overflow: 'scroll' } }
          >

            {highlights}

            {this.props.transcript &&
            <Paragraphs
              labelsOptions={ this.state.labelsOptions && this.state.labelsOptions }
              annotations={ this.state.annotations ? this.state.annotations : [] }
              transcriptJson={ this.props.transcript }
              searchString={ this.state.searchString ? this.state.searchString : '' }
              showParagraphsMatchingSearch={ this.state.showParagraphsMatchingSearch }
              selectedOptionLabelSearch={ this.state.selectedOptionLabelSearch ? this.state.selectedOptionLabelSearch : [] }
              selectedOptionSpeakerSearch={ this.state.selectedOptionSpeakerSearch ? this.state.selectedOptionSpeakerSearch : [] }
              transcriptId={ this.props.transcriptId }
              handleTimecodeClick={ this.handleTimecodeClick }
              handleWordClick={ this.handleWordClick }
              handleDeleteAnnotation={ this.handleDeleteAnnotation }
              handleEditAnnotation={ this.handleEditAnnotation }
            />}

          </Card.Body>
        </Card>
      </>
    );
  }
}

export default Transcript;
