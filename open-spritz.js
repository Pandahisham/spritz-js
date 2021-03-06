String.prototype.endsWith = String.prototype.endsWith || function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

window.accurateInterval = function (fn, time) {
    var cancel, nextAt, timeout, wrapper, _ref;
    nextAt = new Date().getTime() + time;
    timeout = null;
    if (typeof time === 'function') _ref = [time, fn], fn = _ref[0], time = _ref[1];
    wrapper = function () {
        nextAt += time;
        timeout = setTimeout(wrapper, nextAt - new Date().getTime());
        return fn();
    };
    cancel = function () {
        return clearTimeout(timeout);
    };
    delay = function (ms) {
        nextAt += ms;
    };
    timeout = setTimeout(wrapper, nextAt - new Date().getTime());
    return {
        cancel: cancel,
        delay: delay
    };
};


var ospritz = ospritz || {

    model: {
        state: {
            paragraph: 0,
            sentence: 0,
            word: 0
        },
        inputElement: $(),
        outputElement: $(),
        wpm: 500,
        savewpm: 500,
        timer: {
            cancel: function () {}
        },

        init: function (inputElement, wpm, outputElement) {
        		this.cleanText = inputElement.val();
            this.cleanText = this.cleanText.replace(/e\.g\./g, "for example");
            this.cleanText = this.cleanText.replace(/i\.e\./g, "that is");
            this.cleanText = this.cleanText.replace(/(\w)- /g, "$1");
            this.cleanText = this.cleanText.replace(/p\. (\d)/g, "p $1");
            //this.cleanText = this.cleanText.replace(/et al./g, "et al");
            this.cleanText = this.cleanText.replace(/(\w)\n([a-z])/g,"$1 $2");
            this.cleanText = this.cleanText.replace(/([\w])-\n([a-z])/g,"$1$2");
            this.cleanText = this.cleanText.replace(/(^|[^\n])\n([^\n]|$)/g, "$1\n\n$2");
            this.cleanText = this.cleanText.replace(/(\w)\n/g,"$1.\n");
            
        		inputElement.val(this.cleanText);
            this.data = {
                text: this.cleanText,
                paragraphs: this.getParagraphs(text)
            };

            this.wpm = wpm;
            this.savewpm = wpm;
            this.outputElement = outputElement;
            this.inputElement = inputElement;
        },

        getParagraphs: function (text) {
        	  var map = function (x) {
                return {
                    text: x,
                    sentences: this.getSentences(x)
                };
            };
            
            return text.value.split(/[\n\r]+/g).filter(this.nonEmpty).map(map.bind(this));
        },

        getSentences: function (text) {
            var map = function (x) {
                return {
                    text: x,
                    words: this.getWords(x)
                };
            };
            //return text.split(/[\.\?!]+/g).filter(this.nonEmpty).map(map.bind(this));
            // var arr = text.match( /[^\.!\?]+[\.!\?]+/g );
            var arr = text.match( /[^\.!\?]+[\.!\?]+[^a-zA-Z0-9,]*?/g );
            
            if(arr == null) 
              arr = text.split(/[\.\?!\n\r]+/g).filter(this.nonEmpty).map(map.bind(this));
            else 
            	arr = arr.filter(this.nonEmpty).map(map.bind(this));
            return arr;
        },

        getWords: function (text) {
            return text.split(/[\s]+/g).filter(this.nonEmpty).map(function (val, index, arr) {
                return (index == arr.length - 1) ? val + "" : val;
            });
        },

        nonEmpty: function (x) {
            return x.length > 0;
        }
    },

    splitWord: function (word) {
        var pivot = 1;

        switch (word.length) {
            case 0:
            case 1:
                pivot = 0;
                break;
            case 2:
            case 3:
            case 4:
            case 5:
                pivot = 1;
                break;
            case 6:
            case 7:
            case 8:
            case 9:
                pivot = 2;
                break;
            case 10:
            case 11:
            case 12:
            case 13:
                pivot = 3;
                break;
            default:
                pivot = 4;
        }

        return [word.substring(0, pivot), word.substring(pivot, pivot + 1), word.substring(pivot + 1)];
    },

    draw: function (word) {
        var splitWord = this.splitWord(word);
        var outputElement = this.model.outputElement;
        outputElement.find('.left .text').html(splitWord[0]);
        outputElement.find('.pivot').html(splitWord[1]);
        outputElement.find('.right').html(splitWord[2]);
    },

    spritzParagraph: function () {
        this.spritzSentence();
    },

    spritzSentence: function () {
        var self = this;
        var model = this.model;
        var state = model.state;
        var paragraphs = model.data.paragraphs;
        var xsentences = paragraphs[state.paragraph].sentences;
        var sentence = paragraphs[state.paragraph].sentences[state.sentence];
        state.word = 0; // start reading from the first word

				var ta = this.model.inputElement;
        ta.highlightTextarea('destroy');
        ta.highlightTextarea({ sentence: sentence});
        ta.scrollToText(sentence.text);

        var doNextWord = function () {
            if (state.word == sentence.words.length) {
                model.timer.cancel();
                self.finishSentence();
                return;
            }
            var next = sentence.words[state.word + 1];
            if (next && next.endsWith(",")) {
                model.timer.delay(100);
            }
            self.draw(sentence.words[state.word]);
            state.word++;
        };
        var step = model.wpm == 0 ? 100000 : 60000 / model.wpm;
        model.timer = accurateInterval(doNextWord, step);
    },

    finishSentence: function () {
        var state = this.model.state;
        var paragraph = this.model.data.paragraphs[state.paragraph];
        state.sentence++;
        if(state.sentence == paragraph.sentences.length) {
            this.finishParagraph(); //finished the paragraph
        } else {
            var self = this;
            this.model.timeout = setTimeout(function () {
                self.spritzSentence(); //do another sentence
            }, 300);
        }
    },

    finishParagraph: function () {
        var state = this.model.state;
        var paragraphs = this.model.data.paragraphs;
        state.paragraph++;
        if (state.paragraph == paragraphs.length) {
            this.finishSpritz(); //finished the spritz
        } else {
            var self = this;
            this.model.state.sentence = 0; // start reading from the first sentence
            this.model.timeout = setTimeout(function () {
                self.spritzParagraph(); //do another paragraph
            }, 500);
        }
    },

    finishSpritz: function () {
        this.model.state = {
            paragraph: 0,
            sentence: 0,
            word: 0
        };

        this.clearTimers();
    },

    startSpritzing: function () {
        var start = Date.now();
        this.spritzParagraph();
    },

    clearTimers: function () {
        clearTimeout(this.model.timeout);
        this.model.timer.cancel();
    },

    resume: function() {
      this.model.wpm = this.model.savewpm;
      this.startSpritzing();
    },
    pause: function() {
      this.model.wpm = 0;
      this.clearTimers();
    },
    left: function() {
    	var state     = this.model.state;
    	var sentence  = state.sentence;
    	var paragraph = state.paragraph;
    	
    	if(sentence > 0) {
    	  state.sentence--;
    	} else if(paragraph > 0) {
    	  while(this.model.data.paragraphs[--state.paragraph].sentences.length == 0);
    	  state.sentence = this.model.data.paragraphs[state.paragraph].sentences.length - 1;
    	}
      this.clearTimers();
      this.startSpritzing();
    },
    right: function() {
    	var state     = this.model.state;
    	var sentence  = state.sentence;
    	var paragraph = state.paragraph;
    	
    	if(sentence < this.model.data.paragraphs[paragraph].sentences.length - 1) {
    	  state.sentence++;
    	} else if(paragraph < this.model.data.paragraphs.length - 1) {
    	  while(this.model.data.paragraphs[++state.paragraph].sentences.length == 0);
    	  state.sentence = 0;//this.model.data.paragraphs[state.paragraph].sentences.length - 1;
    	}
      this.clearTimers();
      this.startSpritzing();
    },
    up: function() {
    	var state     = this.model.state;
    	var sentence  = state.sentence;
    	var paragraph = state.paragraph;
    	if(sentence > 0) {
    	  state.sentence = 0;
    	} else {
	    	if(paragraph > 0) state.paragraph--;
	    	state.sentence = 0;
	    }
    	this.right();this.left();
      this.clearTimers();
      this.startSpritzing();
    },
    down: function() {
    	var state     = this.model.state;
    	var sentence  = state.sentence;
    	var paragraph = state.paragraph;
    	if(paragraph < this.model.data.paragraphs.length - 1) {
 			  state.paragraph++;
    		state.sentence = 0;
    		this.right();this.left();
	    } else {
    	  state.sentence = this.model.data.paragraphs[state.paragraph].sentences.length - 1;
      	this.left();this.right();
	    }
      this.clearTimers();
      this.startSpritzing();
    },

    
    
    abort: function() {
      this.model.state.sentence = 0; // start reading from the first sentence
      this.finishSpritz();
    },
    init: function (inputElement, wpm, outputElement) {
        if (!window.jQuery) throw "jQuery Not Loaded";
        this.clearTimers();
        this.model.init(inputElement, wpm, outputElement);
        this.startSpritzing();
    }
};
