//our username 
var name; 
var connectedUser; 

//connecting to our signaling server 
var ws_scheme = window.location.protocol == "https:" ? "wss" : "ws";
var conn = new WebSocket(ws_scheme + "://" + window.location.host);
/*console.log("scheme: ",ws_scheme);*/
console.log("host: ", window.location.host);
//var conn = new WebSocket('ws://localhost:8000');
//var conn = new WebSocket('ws://192.168.1.151:8000');
//var ws_scheme = window.location.protocol == "https:" ? "wss" : "ws";
//var chat_socket = new ReconnectingWebSocket(ws_scheme + '://' + window.location.host + "/chat" + window.location.pathname);


conn.onopen = function () { 
   console.log("Connected to the signaling server");
};
 
//when we got a message from a signaling server 
conn.onmessage = function (msg) { 
   console.log("Got message", msg.data); 
   var data = JSON.parse(msg.data); 
   
   switch(data.type) { 
      case "login": 
         handleLogin(data.success); 
         break; 
      //when somebody wants to call us 
      case "offer": 
         console.log("offer: ",dataChannel.readyState);
         handleOffer(data.offer, data.name); 
         break; 
      case "answer":
         console.log("answer: ",dataChannel.readyState); 
         handleAnswer(data.answer); 
         break; 
      //when a remote peer sends an ice candidate to us 
      case "candidate": 
         console.log("candidate: ",dataChannel.readyState);
         handleCandidate(data.candidate); 
         break; 
      case "leave": 
         console.log("leave: ",dataChannel.readyState);
         handleLeave(); 
         break; 
      default: 
         break; 
   } 
}; 

conn.onerror = function (err) { 
   console.log("Got error", err); 
}; 

//alias for sending JSON encoded messages 
function send(message) { 

   //attach the other peer username to our messages
   if (connectedUser) { 
      message.name = connectedUser; 
   } 
   
   conn.send(JSON.stringify(message)); 
};
 
//****** 
//UI selectors block 
//****** 

var loginPage = document.querySelector('#loginPage'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn'); 

var callPage = document.querySelector('#callPage'); 
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 

var hangUpBtn = document.querySelector('#hangUpBtn'); 
var msgInput = document.querySelector('#msgInput'); 
var sendMsgBtn = document.querySelector('#sendMsgBtn'); 

//*******
// Video
var localVideo = document.querySelector('#localVideo'); 
var remoteVideo = document.querySelector('#remoteVideo');
//var stream; 
//*******

var chatArea = document.querySelector('#chatarea'); 
var yourConn; 
var dataChannel; 
callPage.style.display = "none"; 

// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) { 
   name = usernameInput.value; 
   
   if (name.length > 0) { 
      send({ 
         type: "login", 
         name: name 
      }); 
   } 
   
});
 
function handleLogin(success) { 

   if (success === false) {
      alert("Ooops...try a different username"); 
   } else { 
      loginPage.style.display = "none"; 
      callPage.style.display = "block"; 
      
      //********************** 
      //Starting a peer connection 
      //********************** 
      
      //************
      //Video
      //Getting local video stream         
      //displaying local video stream on the page 

      // Prefer camera resolution nearest to 1280x720.
      var constraints = { audio: true, video: { width: 1280, height: 720 } }; 
      if (name === 'user2') {
         var constraints = { audio: true, video: { width: 1280, height: 720 } };
      }
      else {
         var constraints = { audio: true, video: {mediaSource: 'screen' || 'window', width: window.screen.width, height: 800} };
      }

      navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        localVideo.srcObject = stream;      
         //*******************


         //using Google public stun server 
         var configuration = { 
            "iceServers": [{ "urls": "stun:stun2.1.google.com:19302" }] 
         }; 
         
         yourConn = new RTCPeerConnection(configuration); 

         //************
         //Video
         //Chrome doesn't support RTCpeercon.addTrack(), so chrome use else statement.
         if (typeof yourConn.addTrack === "function") {
            // begin sending the local video across the peer connection to the caller.
            stream.getTracks().forEach(track => yourConn.addTrack(track, stream));
            //when a remote user adds stream to the peer connection, we display it 
            yourConn.ontrack = function (e) { 
               remoteVideo.srcObject = e.streams[0];
            };
         }
         // This is old method in the process of dropping
         else {
            yourConn.addStream(stream);
            yourConn.onaddstream = function (e) { 
               remoteVideo.srcObject = e.stream;
            };
         }
                 
         //************

         // Setup ice handling 
         yourConn.onicecandidate = function (event) { 
            if (event.candidate) { 
               send({ 
                  type: "candidate", 
                  candidate: event.candidate 
               }); 
            } 
         }; 
         
         yourConn.ondatachannel = function(event) {
         	receiveChannel = event.channel;
         	receiveChannel.onmessage = function(event){
         		document.querySelector("#chatarea").innerHTML += connectedUser + ": " + event.data + "<br />"; 
         	}
         }

         //creating data channel 
         dataChannel = yourConn.createDataChannel("channel1", {reliable:true}); 
         console.log(dataChannel.readyState);

         dataChannel.onerror = function (error) { 
            console.log("Ooops...error:", error); 
         }; 
         
         //when we receive a message from the other peer, display it on the screen 
        // dataChannel.onmessage = function (event) { 
         //   chatArea.innerHTML += connectedUser + ": " + event.data + "<br />"; 
        // }; 
         
         dataChannel.onclose = function () { 
            console.log("data channel is closed"); 
         };
      })
      .catch(function(err) { console.log(err.name + ": " + err.message); }); // always check for errors at the end.
   }
};
 
//initiating a call 
callBtn.addEventListener("click", function () { 
   var callToUsername = callToUsernameInput.value; 
   
   if (callToUsername.length > 0) { 
      connectedUser = callToUsername; 
      // create an offer 
      yourConn.createOffer(function (offer) { 
         send({ 
            type: "offer", 
            offer: offer 
         }); 
         yourConn.setLocalDescription(offer); 
      }, function (error) { 
         alert("Error when creating an offer"); 
      }); 
   } 
   
});
 
//when somebody sends us an offer 
function handleOffer(offer, name) { 
   connectedUser = name; 
   yourConn.setRemoteDescription(new RTCSessionDescription(offer)); 
   
   //create an answer to an offer 
   yourConn.createAnswer(function (answer) { 
      yourConn.setLocalDescription(answer); 
      send({ 
         type: "answer", 
         answer: answer 
      }); 
   }, function (error) { 
      alert("Error when creating an answer"); 
   });
   
};
 
//when we got an answer from a remote user 
function handleAnswer(answer) { 
   yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};
 
//when we got an ice candidate from a remote user 
function handleCandidate(candidate) { 
   yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};
 
//hang up 
hangUpBtn.addEventListener("click", function () { 
   send({ 
      type: "leave" 
   }); 
   
   handleLeave(); 
}); 

function handleLeave() { 
   connectedUser = null; 
   yourConn.close(); 
   yourConn.onicecandidate = null; 
   //*************
   //Video
   remoteVideo.src = null;
   yourConn.onaddstream = null;
   //*************
};
 
//when user clicks the "send message" button 
sendMsgBtn.addEventListener("click", function (event) { 
   var val = msgInput.value; 
   chatArea.innerHTML += name + ": " + val + "<br />"; 
   console.log(dataChannel.readyState);
   //sending a message to a connected peer 
   dataChannel.send(val); 
   msgInput.value = ""; 
});
