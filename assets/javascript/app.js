var config = {
    apiKey: "AIzaSyDKyKIZpxsz6SikrwnBOUJcfMZIotXYsSU",
    authDomain: "rpc-multiplayer.firebaseapp.com",
    databaseURL: "https://rpc-multiplayer.firebaseio.com",
    projectId: "rpc-multiplayer",
    storageBucket: "rpc-multiplayer.appspot.com",
    messagingSenderId: "923891628717"
};

firebase.initializeApp(config);

var database = firebase.database();
var db_players = database.ref("players");
var db_turns = database.ref("turns");
var db_chat = database.ref("chat");

const NUM_PLAYERS_ALLOWED = 2;
let players, numPlayers;
let myID, turn;
let chat, chat_max = 10;

// Find out who are playing the game
db_players.on("value", (snapshot) => {
    players = snapshot.val();

    if (players) {
        numPlayers = players.filter(p => p !== -1).length;

        // For simplicity, Player 1 always makes the first move
        if (turn === null && numPlayers === NUM_PLAYERS_ALLOWED) {
            db_turns.set(0);

            // If a player drops out, set turn and chat to null
        } else if (numPlayers < NUM_PLAYERS_ALLOWED) {
            db_turns.set(null);

            if (numPlayers === 0) {
                db_chat.set(null);
            }

        }
    } else {
        for (let i = 0; i < NUM_PLAYERS_ALLOWED; i++) {
            db_players.child(i).set(-1);
        }

    }

    refreshDisplay();
});

// Find out whose turn it is
db_turns.on("value", (snapshot) => {
    turn = snapshot.val();

    refreshDisplay();
});

// Display chat messages
db_chat.on("value", (snapshot) => {
    chat = (snapshot.val()) ? snapshot.val() : [];

    $("#chatDisplay").html(chat.join(""));
});

// Name can consist of letters and numbers only
function checkName(name) {
    return name.match(/^[a-z0-9]+$/i);
}

function addPlayer(name) {
    if (numPlayers >= NUM_PLAYERS_ALLOWED) {
        $("#playerName").focus();
        $("#errorMessage").html("<p>Sorry, 2 people are already playing the game. Please wait for the next round.</p>");

        return;
    }

    // Input validation
    if (!checkName(name)) {
        $("#playerName").focus();
        $("#errorMessage").html("<p>Please enter your name (letters, numbers only).</p>");

        setInterval(() => $("#errorMessage").empty(), 3000);

        return;
    }


    for (let i = 0; i < NUM_PLAYERS_ALLOWED; i++) {
        if (players[i] === -1) {
            myID = i;

            db_players.child(myID).set({
                "name": name,
                "choice": -1,
                "numWins": 0,
                "numLosses": 0
            });
            db_players.child(myID).onDisconnect().set(-1);

            break;
        }
    }

    displayPage(1);
}

function addMessage(message) {
    $("#chatMessage").val("");
    $("#chatMessage").focus();

    if (chat.length === chat_max) {
        chat.shift();
    }
    chat.push(`<p>${players[myID].name}: ${message}</p>`);

    db_chat.set(chat);
}

function displayPage(page) {
    $(".page").css({
        "display": "none"
    });
    
    $(`.page:nth-of-type(${page + 1})`).css({
        "display": "block"
    });
    
}

function refreshDisplay() {
    // Only refresh the display if the user is in the game
    if (typeof myID !== "number") {
        return;
    }

    if (turn === null) {
        for (let i = 0; i < NUM_PLAYERS_ALLOWED; i++) {
            $(`#player${i} > .name`).html((players[i] !== -1) ? `<h2>${players[i].name}</h2>` : `<h2>Searching for Player ${i + 1}</h2>`);
            $(`#player${i} > .stats`).html((players[i] !== -1) ? `<p>Wins: ${players[i].numWins}, Losses: ${players[i].numLosses}</p>` : "");
            $(`#player${i} > .display`).empty();
        }

    } else {
        for (let i = 0; i < NUM_PLAYERS_ALLOWED; i++) {
            $(`#player${i} > .name`).html(`<h2>${players[i].name}</h2>`);
            $(`#player${i} > .stats`).html(`<p>Wins: ${players[i].numWins}, Losses: ${players[i].numLosses}</p>`);
        }

        $(`#player${myID} > .display`).html((turn === myID) ?
            `<div class="attacks">Rock</div><div class="attacks">Paper</div><div class="attacks">Scissors</div>` :
            `<p>Searching for ${players[turn].name} to make a move.<p>`);
    }
}

$("body").on("click", ".attacks", function () {
    db_players.child(`${turn}/choice`).set($(".attacks").index(this));

    if (turn === NUM_PLAYERS_ALLOWED - 1) {
        let p1 = players[0],
            p2 = players[1];

        if (p1.choice !== p2.choice) {
            // Win condition for Player 1
            if ((p1.choice + 2) % 3 === p2.choice) {
                db_players.child(`0/numWins`).set(p1.numWins + 1);
                db_players.child(`1/numLosses`).set(p2.numLosses + 1);

            } else {
                db_players.child(`0/numLosses`).set(p1.numLosses + 1);
                db_players.child(`1/numWins`).set(p2.numWins + 1);

            }
        }
    }

    // Pass the turn
    db_turns.set((turn + 1) % NUM_PLAYERS_ALLOWED);
});

// Allow the user to hit Enter key to enter name
$("#playerName").on("keyup", function(event) {
    if (event.keyCode === 13) {
        addPlayer($("#playerName").val().trim());
    }
});

$("#button_submit").on("click", function(){
    addPlayer($("#playerName").val().trim());
});

$("#chatMessage").on("keyup", function(event) {
    if (event.keyCode === 13) {
        addMessage($("#chatMessage").val().trim());
    }
});

$(document).ready(function () {
    displayPage(0);
    $("#playerName").focus();
});
