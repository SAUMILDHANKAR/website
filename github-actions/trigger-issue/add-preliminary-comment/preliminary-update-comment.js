var fs = require("fs")

// Global variables
var github
var context

/**
 * @param {Object} g - github object  
 * @param {Object} c - context object 
 * @param {Boolean} actionResult - the previous gh-action's result
 * @param {Number} issueNum - the number of the issue where the post will be made 
 * @description - This function is the entry point into the javascript file, it formats the md file based on the result of the previous step and then posts it to the issue
 */

async function main({ g, c }, { shouldPost, issueNum }){
    github = g
    context = c
    const timeline = await getTimeline(issueNum);	
    // If the previous action returns a false, stop here
    if(shouldPost === false){
      console.log('No need to post comment.')
      return
    }
    //Else we make the comment with the issuecreator's github handle instead of the placeholder.
    else{
      const instructions = makeComment()
      if(instructions !== null){
      // the actual creation of the comment in github
      await postComment(issueNum, instructions)
    }
    }
}

/**
 * Function that returns the timeline of an issue.
 * @param {Number} issueNum the issue's number 
 * @returns an Array of Objects containing the issue's timeline of events
 */

async function getTimeline(issueNum) {
	let arra = []
	let page = 1
  while (true) {
    try {
      const results = await github.issues.listEventsForTimeline({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNum,
        per_page: 100,
        page: page,
      });
      if (results.data.length) {
	      arra = arra.concat(results.data);
      } else {
        break
      }
    } catch (err) {
      console.log(error);
			continue
    }
    finally {
      page++
    }
  }
	return arra
}

async function lastAssignee(timeline) {
	for await (let [index, moment] of timeline.entries()) {
		if (moment.event == 'assigned') { 
			return (moment.event.assignee.login)
		}
        	else {
            		break
        	}
    	}
}

/**
 * @returns {string} - Comment to be posted with the issue creator's name in it!!!
 * @description - This function makes the comment with the issue assignee's github handle using the raw preliminary.md file
 */

function makeComment(){
    // Setting all the variables which formatcomment is to be called with
    const issueCreator = lastAssignee(timeline)
    console.log('assigneename', issueCreator);

    const commentObject = {
        replacementString: issueCreator,
        placeholderString: '${issueCreator}',
        filePathToFormat: './github-actions/trigger-issue/add-preliminary-comment/preliminary-update.md',
        textToFormat: null
    }

    // creating the comment with issue creator's name and returning it!
    const commentWithIssueCreator = formatComment(commentObject)

    return commentWithIssueCreator
}


/**
 * @param {String} replacementString - the string to replace the placeholder in the md file
 * @param {String} placeholderString - the placeholder to be replaced in the md file
 * @param {String} filePathToFormat - the path of the md file to be formatted
 * @param {String} textToFormat - the text to be formatted. If null, use the md file provided in the path. If provided, format that text
 * @returns {String} - returns a formatted comment to be posted on github
 * @description - This function is called by makeComment() and it formats the comment to be posted based on an object input.
 */

function formatComment({ replacementString, placeholderString, filePathToFormat, textToFormat }){
  const text = textToFormat === null ? fs.readFileSync(filePathToFormat).toString('utf-8') : textToFormat
  const commentToPost = text.replace(placeholderString, replacementString)
  return commentToPost
}


/**
 * @param {Number} issueNum - the issue number where the comment should be posted
 * @param {String} comment - the comment to be posted
 * @description - this function is called by main() with the result of makeComment() as the comment argument and it does the actual posting of the comment.
 */

 async function postComment(issueNum, comment){
  try{
    await github.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNum,
      body: comment,
    })
  } 
  catch(err){
    throw new Error(err);
  }
}
  
module.exports = main