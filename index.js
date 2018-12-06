// Import Google Action library
const {dialogflow} = require('actions-on-google');

// Import Express stuff
const express = require('express');
const bodyParser = require('body-parser');

// Import helper packages
const MTUDining = require('mtu-dining');
const Moment = require('moment');

// Create instance
const app = dialogflow();
const Dining = new MTUDining(); // Helper instance for getting helper properties

const mealPlan = {wads: new MTUDining(), mcnair: new MTUDining()};

// Update every hour
function update() {
  return Promise.all([mealPlan.wads.load(Dining.WADS), mealPlan.mcnair.load(Dining.MCNAIR)]);
}

setInterval(update, 3600000);

// Load data in manually for first time
(async () => {
  await update();
})();

// Register handlers for Dialogflow intents
app.intent('Get Menu', async conv => {
  // Normalize parameters
  let date = new Moment();
  let hall = Dining.MCNAIR;

  if (conv.parameters.hall === 'Wads') {
    hall = Dining.WADS;
  }

  if (conv.parameters.date !== '') {
    date = new Moment(conv.parameters.date);
  }

  // If mealtime, change date to correct time during the day
  switch (conv.parameters.meal) {
    case 'breakfast':
      date.set('hour', 9);
      break;
    case 'lunch':
      date.set('hour', 12);
      break;
    case 'dinner':
      date.set('hour', 17);
      break;
    default:
      date.set('hour', 19);
      break;
  }

  const queryDate = {month: date.month(), day: date.date()};

  // Check if weekend
  if (date.day() === 0 || date.day() === 6) {
    return conv.close('Go to Wads, you sluggard.');
  }

  // Get menu
  const thisMenu = mealPlan[hall].get(queryDate);

  // Capitalize hall
  hall = hall[0].toUpperCase() + hall.slice(1);

  // Build response
  let response = 'On ';
  response += date.format('MMMM Do') + ', ';

  response += hall;

  // Correct verb form
  const now = new Moment();
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
});

function arrToResponse(data) {
  const {meal, menu} = data;

  let thisMenu = {};

  if (meal === 'all') {
    thisMenu = menu;
  } else {
    thisMenu[meal] = menu[meal];
  }

  let response = '';

  const len = Object.keys(thisMenu).length;
  let i = 0;

  for (const thisMeal in thisMenu) {
    if (Object.prototype.hasOwnProperty.call(thisMenu, thisMeal)) {
      i++;

      if (i === len && len !== 1) {
        response += 'and ';
      }

      const items = thisMenu[thisMeal];

      items[items.length - 1] = 'and ' + items[items.length - 1];

      response += items.join(', ');
      response += ' for ' + thisMeal;

      if (meal === 'all') {
        if (i === len) {
          response += '.';
        } else {
          response += '; ';
        }
      } else {
        response += '.';
      }
    }
  }

  return response;
}

// Parse POST request as JSON
const expressApp = express().use(bodyParser.json());

// Add route
expressApp.post('/fulfillment', app);

// Listen on port 3111
expressApp.listen(3111);
