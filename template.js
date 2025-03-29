module.exports = {
    HTML: function (title, body) {
        return `
            <!DOCTYPE html>
            <html>
            <head>    
                <title>${title}</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=0.9, user-scalable=no">
                <style>
                  html {
                     height: 100%;
                  }
                  
                  body {
                      min-height: 100vh;
                      margin: 0;
                      flex-direction: column;
                      background-color: white;
                      justify-content: center;
                      align-items: center;
                      width: 100vw;
                  }
                  
                  .background {
                      margin-top: 15px;
                      display: flex;
                      flex-direction: column;
                      height: auto;
                      width: 100%;
                      max-width: 380px;
                      padding: 20px;
                      margin-bottom: 40px;
                      border-radius: 5px;
                      text-align: center;
                      align-items: center;
                  }
        		  
                  form {
                      display: flex;
                      flex-direction: column; 
                      width: 100%
                  }
          
                  .login {
                      margin-top: 10px;
                      margin-bottom: 10px;
                      background: none;
                      padding: 20px;
                      font-weight: 600;
                      outline: none;
                      border-radius: 10px;
                      border: 1px solid #878787;
                  }
                  
                  .btn {            
                      border: none;
                      width: 75%;
                      background: linear-gradient(to right, #10A99A, #AED56F);
                      color: white;
                      padding: 15px 0;
                      font-weight: 600;
                      border-radius: 10px;
                      cursor: pointer;
                      transition: .2s;
                      margin-top: 10px;
                      margin-bottom: 10px;
                  }
        		  
                  .btn:hover {
                      background: linear-gradient(to right, #10A99A, #AED56F);
                  }
        		  
        		  .topnav {
                      height: auto;
                      width: 100vw;
        			  background-color: white;
                      border-bottom: 1px solid black;
        		  }
        		  
        		  .logo {
                      width: 230px;
                      margin-left: 0.5%;
        		  }
        
                  .form-row {
                      display: flex;
                      width: 100%;
                      gap: 10px;
                  }
        
                  .form-row .login {
                      flex: 1;
                  }
        
                  .form-row .btn {
                      flex: 2;
                  }

                  label {
                      font-size: 16px;
                      text-align: left;
                  }

                  select {
                      font-size: 16px;
                      padding: 8px;
                      border: 1px solid #878787;
                      border-radius: 4px;
                      outline: none;
                      cursor: pointer;
                  }
                </style>
            </head>
            <body>
        	  	<div class="topnav">
        			<a href="/"><img class="logo" src="/static/img/attendify.png"></a>
        			<div class="menus">
        				<a></a>
        			</div>
        		</div>
                <center><div class="background">
        		${body}
                </div></center>
            </body>
            </html>
        `;
    },
};
