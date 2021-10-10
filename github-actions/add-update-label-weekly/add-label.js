// Import modules
const findLinkedIssue = require('../utils/find-linked-issue');
var fs = require("fs");
// Global variables
var github;
var context;
const statusUpdatedLabel = 'Status: Updated';
const toUpdateLabel = 'To Update !';
const inactiveLabel = '2 weeks inactive';
const updatedByDays = 3; // number of days ago to check for updates
const inactiveUpdatedByDays = 14; // number of days ago to check for comment by assignee (for 2 week inactive label)
const cutoffTime = new Date()
cutoffTime.setDate(cutoffTime.getDate() - updatedByDays)
const cutoffTime1 = new Date()
cutoffTime1.setDate(cutoffTime1.getDate() - inactiveUpdatedByDays)


/**
 * The main function, which retrieves issues from a specific column in a specific project, before examining the timeline of each issue for outdatedness. If outdated, the old status label is removed, and an updated is requested. Otherwise, the issue is labeled as updated.
 * @param {Object} g github object from actions/github-script 
 * @param {Object} c context object from actions/github-script 
 * @param {Number} columnId a number presenting a specific column to examine, supplied by GitHub secrets
 */
async function main({ g, c }, columnId) {
	github = g;
	context = c;
	// Retrieve all issue numbers from a column
	const issueNums = getIssueNumsFromColumn(columnId);
	for await (let issueNum of issueNums) {
	const timeline = getTimeline(issueNum);
	const assignees = await getAssignees(issueNum);
	// Error catching.
	console.log(`Assignee: ${assignees}`)	
	if (assignees.length === 0) {
	  console.log(`Assignee not found, skipping issue #${issueNum}`)
	  continue
	}
		// Adds label if the issue's timeline indicates the issue is outdated. 
		// Note: inactive label is added as well if the timeline indicates the issue is inactive. Further, the if else structure ensures addLabels commands are limited.
		// 
		
		const responseObject = isTimelineOutdated(timeline, issueNum, assignees)
		if (responseObject.result === true) {
			console.log(`Going to ask for an update now for issue #${issueNum}`);
			await removeLabels(issueNum, ...labels);  
			await addLabels(issueNum, ...labels); 
			await postComment(issueNum, assignees);
		} else {
			console.log(`No updates needed for issue #${issueNum}`);
			await removeLabels(issueNum, ...labels);
			await addLabels(issueNum, ...labels);
		}
		
		/**
		if (await isTimelineOutdated(timeline, issueNum, assignees)) {
			console.log(`Going to ask for an update now for issue #${issueNum}`);
			await removeLabels(issueNum, statusUpdatedLabel, toUpdateLabel);
			await postComment(issueNum, assignees);
			/**if (await isTimelineInactive(timeline, issueNum, assignees)) {
				
				await addLabels(issueNum, inactiveLabel, toUpdateLabel);
			} else {
				await addLabels(issueNum, toUpdateLabel);
			}
			*/
		/**
		} else {
			console.log(`No updates needed for issue #${issueNum}`);
			await removeLabels(issueNum, toUpdateLabel, inactiveLabel);
			await addLabels(issueNum, statusUpdatedLabel);
		}
		*/
	}
}

/**
 * Generator that returns issue numbers from cards in a column.
 * @param {Number} columnId the id of the column in GitHub's database
 * @returns an Array of issue numbers
 */
async function* getIssueNumsFromColumn(columnId) {
  let page = 1;
  while (page < 100) {
    try {
      const results = await github.projects.listCards({
        column_id: columnId,
        per_page: 100,
        page: page
      });
      if (results.data.length) {
        for (let card of results.data) {
          if (card.hasOwnProperty('content_url')) {
            const arr = card.content_url.split('/');
            yield arr.pop()
          }
        }
      } else {
        return
      }
    } catch {
      continue
    } finally {
      page++;
    }
  }
}
/**
 * Generator that returns the timeline of an issue.
 * @param {Number} issueNum the issue's number 
 * @returns an Array of Objects containing the issue's timeline of events
 */
async function* getTimeline(issueNum) {
  let page = 1
  while (page < 100) {
    try {
      const results = await github.issues.listEventsForTimeline({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNum,
        per_page: 100,
        page: page,
      });
      if (results.data.length) {
        yield* results.data
      } else {
        return
      }
    } catch {
      continue
    }
    finally {
      page++
    }
  }
}
/**
 * Assesses whether the timeline is outdated.
 * @param {Array} timeline a list of events in the timeline of an issue, retrieved from the issues API
 * @param {Number} issueNum the issue's number
 * @param {String} assignees a list of the issue's assignee's username
 * @returns true if timeline indicates the issue is outdated, false if not
 * Note: Outdated means that the assignee did not make a linked PR or comment within the cutoffTime (see global variables).
 */


async function isTimelineOutdated(timeline, issueNum, assignees) {
	for await (let moment of timeline) {
		if (isMomentRecent(moment.created_at, cutoffTime) === true && isMomentRecent(moment.created_at, cutoffTime1) === false) {
			if (isLinkedIssue(moment, issueNum)) {
				return responseObject[result === false, label === 'Status: Updated']
			}
			else if (isCommentByAssignees(moment, assignees)) {
				return responseObject [result === false, labels === 'Status: Updated']
			}
			else {
				return responseObject [result === true, labels === 'To Update !']
			}
		}
		else if (isMomentRecent(moment.created_at, cutoffTime1)) {
			if (isLinkedIssue(moment, issueNum)) {
				return responseObject [result === false, labels === 'Status: Updated']
			}
			else if (isCommentByAssignees(moment, assignees)) {
				return responseObject [result === false, labels === 'Status: Updated']
			}
			else {
				return responseObject [result === true, labels === '2 weeks inactive', labels === 'To Update !']
			}
		}
		else if (isCommentByAssignees(moment, assignees)) {
			return responseObject [result === false, labels === 'null']
		}	
	}
}	

/**	  
  if (latest comment is > cutofftime = 3 days && comment < 2 weeks) 
	if (is linked)
		return object {result:false, labels: [status updated]}
	else if (is commented by assignee)
		return object {result:false, labels: [status updated]}
	else 
		return object {result:true, labels: [to update]}
    else if (latest comment is > 2 weeeks)	
    	if (is linked)
		return object {result:false, labels: [status updated]}
	else if (is commented by assignee)
		return object {result:false, labels: [status updated]}
    	else 
		return object {result:true, labels: [2 week inactive, to update]}
		
    else (if assigned recently 5 days)
		return object false and no label
	
*/

/**
async function isTimelineOutdated(timeline, issueNum, assignees) {
  for await (let moment of timeline) {
    
    if (isMomentRecent(moment.created_at, cutoffTime)) {
      if (moment.event == 'cross-referenced' && isLinkedIssue(moment, issueNum)) {
        return false
      } else if (moment.event == 'commented' && isCommentByAssignees(moment, assignees)) {
        return false
      }
    } 
  }
  return true
}
*/
/**
 * Assesses whether the timeline is inactive.
 * Note: Inactive means that the assignee did not make a comment within 14 days (cutoffTime1 derived from inactiveUpdatedByDays1) and there is no linked PR in last 3 days ((cutoffTime2 derived from inactiveUpdatedByDays2)
 */
/**
async function isTimelineInactive(timeline, issueNum, assignees) {
  const cutoffTime1 = new Date()
  cutoffTime1.setDate(cutoffTime1.getDate() - inactiveUpdatedByDays)
  const cutoffTime2 = new Date()
  cutoffTime2.setDate(cutoffTime2.getDate() - updatedByDays)
	console.log(timeline)
  	for await (let moment of timeline) {
		console.log('moment:', moment)
		console.log(`function return: ${isMomentRecent(moment.created_at, cutoffTime2)}`)
		if (isMomentRecent(moment.created_at, cutoffTime1)) {
			console.log('more than 14 days')
			if (moment.event == 'commented' && isCommentByAssignees(moment, assignees)) {
				return false
			} 
		}
		else if (isMomentRecent(moment.created_at, cutoffTime2)) {
			console.log('more than 3 days')
			if (moment.event == 'commented' && isCommentByAssignees(moment, assignees)) {
				return false
			} 
			
			return false
		}
		else {
			console.log('no comment')
			return false
		}
	}
  return true
}
*/


/**
 * Removes labels from a specified issue
 * @param {Number} issueNum an issue's number
 * @param {Array} labels an array containing the labels to remove (captures the rest of the parameters)
 */
async function removeLabels(issueNum, ...labels) {
  for (let label of labels) {
    try {
      // https://octokit.github.io/rest.js/v18#issues-remove-label
      await github.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNum,
        name: label,
      });
      console.log(`Removed "${label}" from issue #${issueNum}`);
    } catch (err) {
      console.error(`No "${label}" label to remove for issue #${issueNum}`);
    }
  }
}
/**
 * Adds labels to a specified issue
 * @param {Number} issueNum an issue's number
 * @param {Array} labels an array containing the labels to add (captures the rest of the parameters)
 */
async function addLabels(issueNum, ...labels) {
  try {
    // https://octokit.github.io/rest.js/v18#issues-add-labels
    await github.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNum,
      labels: labels,
    });
    console.log(`Added these labels to issue #${issueNum}: ${labels}`);
    // If an error is found, the rest of the script does not stop.
  } catch {
    console.error(`Could not add these labels for issue #${issueNum}: ${labels}`);
  }
}
async function postComment(issueNum, assignees) {
  try {
    const assigneeString = createAssigneeString(assignees);
    const instructions = formatComment(assigneeString);
    await github.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNum,
      body: instructions,
    });
  } catch (err) {
    console.error(`Could not post a comment for issue #${issueNum}`);
  }
}
/***********************
*** HELPER FUNCTIONS ***
***********************/
function isMomentRecent(dateString, cutoffTime) {
  const dateStringObj = new Date(dateString);

  if (dateStringObj >= cutoffTime) {
    return true
  } else {
    return false
  }
}


function isLinkedIssue(data, issueNum) {
  return findLinkedIssue(data.source.issue.body) == issueNum
}
function isCommentByAssignees(data, assignees) {
  return assignees.includes(data.actor.login)
}
async function getAssignees(issueNum) {
  try {
    const results = await github.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNum,
    });
    const assigneesData = results.data.assignees;
    assigneesLogins = filterForAssigneesLogins(assigneesData);
    return assigneesLogins
  } catch (err) {
    console.error(`Failed request to get assignee from issue: #${issueNum}`)
    return null
  }
}
function filterForAssigneesLogins(data) {
  logins = [];
  for (let item of data) {
    logins.push(item.login);
  }
  return logins
}
function createAssigneeString(assignees) {
  const assigneeString = [];
  for (let assignee of assignees) {
    assigneeString.push(`@${assignee}`);
  }
  return assigneeString.join(', ')
}
function formatComment(assignees) {
  const path = './github-actions/add-update-label-weekly/update-instructions-template.md'
  const text = fs.readFileSync(path).toString('utf-8');
  const options = {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short',
  }
  const cutoffTimeString = cutoffTime.toLocaleString('en-US', options);
  let completedInstuctions = text.replace('${assignees}', assignees).replace('${cutoffTime}', cutoffTimeString);
  return completedInstuctions
}
module.exports = main
