// Import the appropriate service and chosen wrappers
const {
  dialogflow,
  Image,
} = require('actions-on-google')

const MTUDining = require('mtu-dining');
const moment = require('moment');

const Dining = new MTUDining();

// Create an app instance
const app = dialogflow()

const express = require('express')
const bodyParser = require('body-parser')

// Register handlers for Dialogflow intents
app.intent('Get Menu', async conv => {
	// Normalize parameters
	let date = new moment();
	let hall = Dining.MCNAIR;

	if (conv.parameters.hall === 'Wads') {
		hall = Dining.WADS;
	}

	if (conv.parameters.date !== '') {
		date = new moment(conv.parameters.date);
	}

	const queryDate = {month: date.month(), day: date.date()}

	// Check if weekend
	if (date.day() === 0 || date.day === 6) {
		return conv.close('Go to Wads, you sluggard.');
	}

	// Load menu
	await Dining.load(hall);

	// Get menu
	const thisMenu = Dining.get(queryDate);

	// Capitalize hall
	hall = hall[0].toUpperCase() + hall.slice(1);

	// Build response
  let response = hall;

  // Correct verb form
  const now = new moment();
  if (now > date) {
    response += ' served ';
  } else {
    response += ' will serve ';
  }

	if (conv.parameters.meal) {
		response += arrToResponse({meal: conv.parameters.meal, menu: thisMenu});
	} else {
		response += arrToResponse({meal: 'all', menu: thisMenu});
	}

	return conv.close(response);
})

function arrToResponse(data) {
	const meal = data.meal;
	const menu = data.menu;
	let thisMenu = {};

	if (meal !== 'all') {
		thisMenu[meal] = menu[meal];
	} else {
		thisMenu = menu;
	}

	let response = '';

  const len = Object.keys(thisMenu).length;
  let i = 0;

	for (let thisMeal in thisMenu) {
    i ++;

    if (i === len && len !== 1) {
      response += 'and ';
    }

		let items = thisMenu[thisMeal];

		items[items.length - 1] = 'and ' + items[items.length - 1];

		response += items.join(', ');
		response += ' for ' + thisMeal;

		if (meal === 'all') {
      if (i === len) {
        response += '.';
      } else {
        response += '; ';
      }
    }
		else response += '.';

	}

	return response;
}

// Intent in Dialogflow called `Goodbye`
app.intent('Goodbye', conv => {
  conv.close('See you later!')
})

app.intent('Default Fallback Intent', conv => {
  conv.ask(`I didn't understand. Can you tell me something else?`)
})

const expressApp = express().use(bodyParser.json())

expressApp.post('/fulfillment', app)

expressApp.listen(3111)
