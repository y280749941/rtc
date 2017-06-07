var loginSection = document.querySelector('#loginSection'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn'); 

var peerCallSection = document.querySelector('#peerCallSection'); 
var callUserName = document.querySelector('#callUserName');
var callBtn = document.querySelector('#callBtn'); 

var hangUpBtn = document.querySelector('#hangUpBtn'); 

var messageValue = document.querySelector('#messageValue'); 
var sendBtn = document.querySelector('#sendBtn'); 

//*******
// Video
var callerVideo = document.querySelector('#callerVideo'); 
var calleeVideo = document.querySelector('#calleeVideo');
//var stream; 
//*******
var name; 
var yourConn;
var dataChannel; 
var connectedUser; 

var myInform1;
var myInform2;

var chatHistory = document.querySelector('#chatHistory');
peerCallSection.style.display = "none"; 

// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) { 
   name = usernameInput.value; 
   if (name.length > 0) { 
      var message = { type: "login",
              name: name }
      sendData(message);
   } 
   
});

//initiating a call 
callBtn.addEventListener("click", function () { 
   var callToUsername = callUserName.value; 
   
   if (callToUsername.length > 0) { 
      connectedUser = callToUsername; 
      // create an offer 
      yourConn.createOffer(function (offer) {
        //var kk = JSON.stringify(offer);
        var message = { 
                type: "offer", 
                offer: offer,
                name: name,
                callee: connectedUser 
                      };
    console.log("sending: Offer");
        sendData(message); 
        yourConn.setLocalDescription(offer); 
      }, function (error) { 
        alert("Error when creating an offer"); 
      }); 
   } 
   
});

sendBtn.addEventListener("click", function() {
  var val = messageValue.value; 
    chatHistory.innerHTML += name + ": " + val + "<br />"; 
    //sending a message to a connected peer 
    dataChannel.send(val); 
    messageValue.value = ""; 
});

hangUpBtn.addEventListener("click", function () { 
  var message = { 
              type: "leave",
              name: connectedUser
           };
    sendData(message); 
    handleLeave();
});


function sendData(message){
  $.ajax({
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            url: '/login/',
            data: {text: JSON.stringify(message)},
            success: function(response) {
            //        console.log(JSON.stringify(response));
            //        console.log(typeof(response));
            //        console.log(response);
                    switch(response.type) { 
                      case "login":
                                 myInform1 = response.inform1;
                                 myInform2 = response.inform2; 
                         handleLogin(response.success); 
                         console.log(JSON.stringify(response));
                     
                         break; 
                      //when somebody wants to call us 
                      case "offer": 
                         console.log("offer: ",dataChannel.readyState);
                         handleOffer(response.offer, response.name, response.caller); 
                         console.log(JSON.stringify(response));
                         break; 
                      case "answer":
                         console.log("answer: ",dataChannel.readyState); 
                         handleAnswer(response.answer); 
                         console.log(JSON.stringify(response));
                         break; 
                      //when a remote peer sends an ice candidate to us 
                      case "candidate": 
                         console.log("candidate: ",dataChannel.readyState);
                         handleCandidate(response.candidate); 
                         console.log(JSON.stringify(response));
                         break; 
                      case "leave": 
                         console.log("leave: ",dataChannel.readyState);
                         handleLeave(); 
                         console.log(JSON.stringify(response));
                         break; 
                      default:
                     //    console.log("Not relavent"); 
                         break; 
                   }
            }
    });
 }

function handleLogin(success) { 

   if (success === false) {
      alert("user name is exist"); 
   } else { 
      loginSection.style.display = "none"; 
      peerCallSection.style.display = "block"; 
      
      //********************** 
      //Starting a peer connection 
      //********************** 
      
      //************
      //Video
      //Getting local video stream         
      //displaying local video stream on the page 

      // Prefer camera resolution nearest to 1280x720.
      var constraints = { audio: true, video: true }; 
      if (name === 'user2') {
         var constraints = { audio: true, video: {mediaSource: 'screen' || 'window', width: window.screen.width, height: 800} };
      }
  //    else {
  //       var constraints = { audio: true, video: {mediaSource: 'screen' || 'window', width: window.screen.width, height: 800} };
  //    }

      navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        callerVideo.srcObject = stream;      
         //*******************


         //using Google public stun server 
        /* var configuration = {
             iceServers: [{
                         "url": "stun:piratefsh@45.55.61.164"
              }, 
              {
                      // Use my TURN server on DigitalOcean
                        'url': 'turn:piratefsh@45.55.61.164',
                        'credential': 'password'
              }]
             //'iceServers': [{ 'url': 'stun:stun.sipgate.net:10000' }] 
            //"iceServers": [{ "urls": "stun:stun2.1.google.com:19302" }] 
         }; 
         
         //var server = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'},{'url': 'stun:stun1.l.google.com:19302'}, {'url': 'stun:stun2.l.google.com:19302'}]};
         var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
                                        {"url":"turn:mike@138.197.30.142>",
                                        "credential":"a7758521"
                                        }]
         };*/
         var pc_config = {
             iceServers: [
             {
                 'url': 'stun:stun2.l.google.com:19302'
             },
             {
                 urls: 'turn:138.197.30.142:3478',
                 username: myInform1,
                 credential: myInform2
             }]
         };
         yourConn = new RTCPeerConnection(pc_config); 

         //************
         //Video
         //Chrome doesn't support RTCpeercon.addTrack(), so chrome use else statement.
         if (typeof yourConn.addTrack === "function") {
            // begin sending the local video across the peer connection to the caller.
            stream.getTracks().forEach(track => yourConn.addTrack(track, stream));
            //when a remote user adds stream to the peer connection, we display it 
            yourConn.ontrack = function (e) { 
               calleeVideo.srcObject = e.streams[0];
            };
         }
         // This is old method in the process of dropping
         else {
            yourConn.addStream(stream);
            yourConn.onaddstream = function (e) { 
               calleeVideo.srcObject = e.stream;
            };
         }
                 
         //************

         // Setup ice handling 
         yourConn.onicecandidate = function (event) { 
            if (event.candidate) { 
               var message = {
                        name: name, 
                        type: "candidate", 
                        candidate: event.candidate
                        
                       };
          sendData(message); 
            } 
         }; 
         
         yourConn.ondatachannel = function(event) {
          receiveChannel = event.channel;
          receiveChannel.onmessage = function(event){
            document.querySelector("#chatHistory").innerHTML += connectedUser + ": " + event.data + "<br />"; 
          }
         }

         //creating data channel 
         dataChannel = yourConn.createDataChannel("channel1"); 
         console.log(dataChannel.readyState);

         dataChannel.onerror = function (error) { 
            console.log("Ooops...error:", error); 
         }; 
         
         //when we receive a message from the other peer, display it on the screen 
        // dataChannel.onmessage = function (event) { 
         //   chatHistory.innerHTML += connectedUser + ": " + event.data + "<br />"; 
        // }; 
         
         dataChannel.onclose = function () { 
            console.log("data channel is closed"); 
         };
      })
      .catch(function(err) { console.log(err.name + ": " + err.message); }); // always check for errors at the end.
   }
   setInterval(function(){sendData({type:'constant',name: name});}, 100);

};

//when somebody sends us an offer 
function handleOffer(offer, name,caller) { 
   connectedUser = caller;
   console.log("it's meeeeeeeee ", connectedUser);
   yourConn.setRemoteDescription(new RTCSessionDescription(offer)); 
   
   //create an answer to an offer 
   yourConn.createAnswer(function (answer) { 
      yourConn.setLocalDescription(answer); 
      var message = { 
                name: name,
                type: "answer", 
                answer: answer
                 
              };
      sendData(message); 
   }, function (error) { 
      alert("Error when creating an answer"); 
   });
   
};

function handleAnswer(answer) { 
   yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};
 
//when we got an ice candidate fleaverom a remote user 
function handleCandidate(candidate) { 
   yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};

function handleLeave() { 
   connectedUser = null; 
   yourConn.close(); 
   yourConn.onicecandidate = null; 
   //*************
   //Video
   calleeVideo.src = null;
   yourConn.onaddstream = null;
   //*************
};
