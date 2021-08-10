// if using Node.js export module
if (typeof exports !== "undefined" && this.exports !== exports) {
  var Token = require("./Token.js").Token;
  var MultiwordToken = require("./MultiwordToken.js").MultiwordToken;
  var TokenAggregate = require("./TokenAggregate.js").TokenAggregate;
}
/**
 * A Sentence is a collection of comments (including metadata), Tokens, and MultiwordTokens representing a sentence within a Conllu file.
 * For example, a Sentence may represent the following lines in a file:
 *
 * # sent_id 2
 * # ...
 * 1	I	I	PRON	PRP	Case=Nom|Number=Sing|Person=1	2	nsubj	_	_
 * 2-3	haven't	_	_	_	_	_	_	_	_
 * 2	have	have	VERB	VBP	Number=Sing|Person=1|Tense=Pres	0	root	_	_
 * 3	not	not	PART	RB	Negative=Neg	2	neg	_	_
 * 4	a	a	DET	DT	Definite=Ind|PronType=Art	4	det	_	_
 * 5	clue	clue	NOUN	NN	Number=Sing	2	dobj	_	SpaceAfter=No
 * 6	.	.	PUNCT	.	_	2	punct	_	_
 *
 * @property metadata {Object}
 * The metadata object maintains the metadata as key-value pairs.
 *
 * @property tokens {Array}
 * The tokens property maintains an ordered list of all Tokens and Multiword tokens.
 * In the example given above, a single MultiwordToken would be responsible for lines starting with ids 1-2, 2, and 3
 *
 * @constructor
 */
var Sentence = function () {
  /**
   * Metadata are key value pairs in the form of comments. They are represented
   * as
   *
   * # key = value
   *
   * in the CoNLL-U file.
   * @type {Object}
   */
  this.metadata = {};

  /**
   * tokens should be an ordered list of tokens and multiword tokens.
   * We will rely on the ordering of this list to display the tokens in the correct order - not the ids
   * of the tokens. Note, however, that the ids of the tokens/multiwordtokens and subtokens should be
   * maintained by the sentence.
   * @type {Array}
   */
  this.tokens = [];

  TokenAggregate.call(this, "tokens");
};

Sentence.prototype = {
  expand: function (token_id, index) {
    var found = false;
    for (var i = 0; i < this.tokens.length; i++) {
      if (found === true) {
        if (!(this.tokens[i] instanceof MultiwordToken)) {
          this.tokens[i].id++; //increases id's by 1 after expansion
          //console.log(this.tokens[i]);
        } else {
          this.tokens[i].tokens.forEach(function (child) {
            child.id++; //updates the id's of the children in every multi-word token.
            //the parent in a multi-word token updates automatically based on the children.
          });
        }
      } else if (
        this.tokens[i].id === token_id &&
        !(this.tokens[i] instanceof MultiwordToken)
      ) {
        var initial = new Token(); //variable to store first half of expanded token
        var second = new Token(); //variable to store second half of expanded token
        var expandToken = new MultiwordToken(); //create new instance of mwt for expanded token//

        expandToken.form = this.tokens[i].form; // only duplicate form; id depends on id's of sub-tokens; other properties should be undefined
        initial.form = this.tokens[i].form.slice(0, index);
        initial.id = this.tokens[i].id; //update id of first sub-token
        second.form = this.tokens[i].form.slice(index);
        second.id = Number(this.tokens[i].id) + 1; //update id of second sub-token
        expandToken.tokens.push(initial);
        expandToken.tokens.push(second);
        this.tokens.splice(i, 1, expandToken); // inserts new word at the correct index in the array, removes original token
        //note: all information stored in initial token is lost. To be confirmed.
        found = true;
        //console.log(this.tokens[1]);
      }
    }
  },

  collapse: function (token_id) {
    var found = false;
    for (var i = 0; i < this.tokens.length; i++) {
      if (found === true) {
        if (!(this.tokens[i] instanceof MultiwordToken)) {
          this.tokens[i].id = Number(this.tokens[i].id - (mwt_length - 1)); //updates the id's of every token after collapse
          //note: also valid if mwt has more than 2 sub-tokens
        } else {
          this.tokens[i].tokens.forEach(function (child) {
            child.id = Number(child.id - (mwt_length - 1)); //updates the id's of the children in every multi-word token.
            //the parent in a multi-word token updates automatically based on the children.
          });
        }
      } else if (this.tokens[i].id === token_id) {
        // note: must be a string, since the id of a mwt is a string
        if (this.tokens[i] instanceof MultiwordToken) {
          //collapse only applies to mwt
          var mwt_length = this.tokens[i].tokens.length; // find the length of the mwt sub-tokens array, for updating other values
          var collapsed = new Token(); // note: is not a mwt
          //collapsed.id = Number(this.tokens[i].id.slice(0,1)); // wouldn't work for mwt token 34-35, for example.
          collapsed.id = Number(this.tokens[i].tokens[0].id); // token "collapsed" can be assigned an id: takes the id of the first child of the mwt
          collapsed.form = this.tokens[i].form;
          this.tokens.splice(i, 1, collapsed);
          found = true;
        }
        //if this.tokens[i] isn't an instance of a MultiwordToken, do nothing.
      }
    }
  },
};

Object.defineProperty(Sentence.prototype, "serial", {
  get: function () {
    var serialArray = [];

    for (const [metadataKey, metadataValue] of Object.entries(this.metadata)) {
      serialArray.push("# " + metadataKey + " = " + metadataValue);
    }

    for (var i = 0; i < this.tokens.length; i++) {
      serialArray.push(this.tokens[i].serial);
    }
    serialArray.push(""); //add empty string for line break after sentence
    return serialArray.join("\n");
  },
  set: function (arg) {
    this.metadata = {};
    this.tokens = [];
    var lines = arg.split("\n");
    for (var i = 0; i < lines.length; i++) {
      //identify metadata in string & add to metadata object
      if (lines[i].startsWith("#")) {
        // matches with regex the key-value pair of the comment
        // (if there is some at this line)
        const metadataRegex = new RegExp("# (.*) = (.*)", "g");
        const matchedMetadata = metadataRegex.exec(lines[i]);

        // if there are matches..
        if (matchedMetadata) {
          // gets the metadata key
          const metadataKey = matchedMetadata[1];

          // gets the metadata value
          const metadataValue = matchedMetadata[2];

          // sets key value pair
          this.metadata[metadataKey] = metadataValue;
        }
      }
    }

    var mwtSubIds = [];
    for (var i = 0; i < lines.length; i++) {
      var fields = [];
      fields = lines[i].split("\t"); //split into subfields to identify mwt ids
      var currentLineId = fields[0];
      if (!lines[i].startsWith("#") && !(lines[i] === "")) {
        //find non-comments/non-empty lines
        var mwtId = null;
        if (fields[0].includes("-")) {
          mwtString = lines[i] + "\n";
          mwtId = fields[0];
          dashIndex = fields[0].indexOf("-");
          var first = Number(mwtId.slice(0, dashIndex)); //everything before/after slash
          var last = Number(mwtId.slice(dashIndex + 1));
          var span = [];
          while (first <= last) {
            span.push(Number(first++)); //get span of mwt ids to match all mwt subtoken ids
          }
          mwtSubIds = span.map(function (id) {
            return id;
          });
          span = span.map(String);
          for (var j = 0; j < lines.length; j++) {
            //add all subtokens to mwt string
            var innerFields = [];
            innerFields = lines[j].split("\t");
            for (var x = 0; x < span.length; x++) {
              if (span[x] === innerFields[0]) {
                mwtString = mwtString + (lines[j] + "\n");
              }
            }
          }
          mwtString = mwtString.substring(0, mwtString.length - 1);
          var setMwt = new MultiwordToken();
          setMwt.serial = mwtString; //serialize mwt string
          // this.tokens.push(setMwt);
          this.tokens = this.tokens.concat(setMwt.tokens);
        } else if (mwtSubIds.indexOf(Number(currentLineId)) === -1) {
          var setToken = new Token();
          setToken.serial = lines[i];
          this.tokens.push(setToken);
        }
      }
    }
  },
});
// if using Node.js export module
if (typeof exports !== "undefined" && this.exports !== exports) {
  exports.Sentence = Sentence;
}
