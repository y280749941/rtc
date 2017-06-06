var loginPage = document.querySelector('#loginPage'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn'); 

var callPage = document.querySelector('#callPage'); 
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 

var hangUpBtn = document.querySelector('#hangUpBtn'); 
var callBtn1 = document.querySelector('#callBtn1'); 

var hangUpBtn1 = document.querySelector('#hangUpBtn1'); 
//var msgInput = document.querySelector('#msgInput'); 
//var sendMsgBtn = document.querySelector('#sendMsgBtn'); 

//*******
// Video
var localVideo = document.querySelector('#localVideo'); 
var remoteVideo = document.querySelector('#remoteVideo');
//var stream; 
//*******
var name; 
var yourConn;
var dataChannel; 
var connectedUser; 

//var chatArea = document.querySelector('#chatarea');
callPage.style.display = "none"; 

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
   var callToUsername = callToUsernameInput.value; 
   
   if (callToUsername.length > 0) { 
      connectedUser = callToUsername; 
      // create an offer 
      yourConn.createOffer(function (offer) {
      	//var kk = JSON.stringify(offer);
      	var message = { 
      					type: "offer", 
				        offer: offer,
				        name: name 
				         			};
		console.log("sending: Offer");
      	sendData(message); 
        yourConn.setLocalDescription(offer); 
      }, function (error) { 
        alert("Error when creating an offer"); 
      }); 
   } 
   
});


hangUpBtn.addEventListener("click", function () { 
	var message = { type: "GetOffer"};
   	sendData(message); 

});

callBtn1.addEventListener("click", function () { 
	var message = { type: "GetAnswer"};
   	sendData(message); 
});
hangUpBtn1.addEventListener("click", function () { 
	var message = { type: "GetIce", name: name};
   	sendData(message); 
});


function sendData(message){
	$.ajax({
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            url: '/login/',
            data: {text: JSON.stringify(message)},
            success: function(response) {
                    console.log(JSON.stringify(response));
                    console.log(typeof(response));
                    console.log(response);
                    switch(response.type) { 
				      case "login": 
				         handleLogin(response.success); 
				         break; 
				      //when somebody wants to call us 
				      case "offer": 
				         console.log("offer: ",dataChannel.readyState);
				         handleOffer(response.offer, response.name); 
				         break; 
				      case "answer":
				         console.log("answer: ",dataChannel.readyState); 
				         handleAnswer(response.answer); 
				         break; 
				      //when a remote peer sends an ice candidate to us 
				      case "candidate": 
				         console.log("candidate: ",dataChannel.readyState);
				         handleCandidate(response.candidate); 
				         break; 
				/*      case "leave": 
				         console.log("leave: ",dataChannel.readyState);
				         handleLeave(); 
				         break; */
				      default:
				      	 console.log("Not relavent"); 
				         break; 
				   }
            }
    });
 }

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
      var constraints = { audio: true, video: { width: window.screen.width, height: 720 } }; 
      if (name === 'user2') {
         var constraints = { audio: true, video: { width: window.screen.width, height: 720 } };
      }
  //    else {
  //       var constraints = { audio: true, video: {mediaSource: 'screen' || 'window', width: window.screen.width, height: 800} };
  //    }

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
               var message = {
               				  name: name, 
			                  type: "candidate", 
			                  candidate: event.candidate
			                  
			               	 };
			    console.log("sending candidate");
			    sendData(message); 
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
   setInterval(function(){sendData({type:'constant',name: name});}, 100);

};

//when somebody sends us an offer 
function handleOffer(offer, name) { 
   connectedUser = name; 
   yourConn.setRemoteDescription(new RTCSessionDescription(offer)); 
   
   //create an answer to an offer 
   yourConn.createAnswer(function (answer) { 
      yourConn.setLocalDescription(answer); 
      var message = { 
      					name: name,
			         	type: "answer", 
			         	answer: answer
			         	 
			      	};
	  console.log("It's your: ",name)
      sendData(message); 
   }, function (error) { 
      alert("Error when creating an answer"); 
   });
   
};

function handleAnswer(answer) { 
   yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};
 
//when we got an ice candidate from a remote user 
function handleCandidate(candidate) { 
   yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};