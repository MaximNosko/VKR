let CLIENT_ADDRESS="http://localhost:49053/";
async function runSRPCommand(appID,type,args,signURL,onWaiting,onDone,onError,onReturn)
{
	onWaiting();
	args.path=encodeURIComponent(args.path.replaceAll("\\", "/"));
	let commandObject={};
	function getReadCommandObject(args,APP_ID)
	{
		return {"type":"read","args":{"path":args.path},"appID":APP_ID};
	}
	function getWriteCommandObject(args,APP_ID)
	{
		return {"type":"write","args":{"path":args.path,"bytes":args.bytes},"appID":APP_ID};
	}
	if(type==="read")
	{
		commandObject=getReadCommandObject(args,appID);
	}
	if(type==="write")
	{
		commandObject=getWriteCommandObject(args,appID);
	}
	function getSortedObject(uObj)
	{
		uObj["args"]=Object.keys(uObj["args"]).sort().reduce(
		(obj, key) => { 
			obj[key] = uObj["args"][key]; 
			return obj;
		}, 
		{}
		);
		return Object.keys(uObj).sort().reduce(
		(obj, key) => { 
			obj[key] = uObj[key]; 
			return obj;
		}, 
		{}
		);
	}
	commandObject=getSortedObject(commandObject);
	async function sha256(message) {
		const msgBuffer = new TextEncoder().encode(message);                    
		const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));            
		const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		return hashHex;
	}
	async function getHash(commandObject)
	{
		console.log("json");
		console.log(JSON.stringify(commandObject))
		console.log("sha256")
		let t=await sha256(JSON.stringify(commandObject));
		console.log(t)
		return t;
	}
	let commandHash=await getHash(commandObject);
	function sendServerPost(hash,commandObject)
	{
		var xhr = new XMLHttpRequest();
		var url = signURL;
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				receiveSign(xhr.responseText,commandObject);
			}
		};
		var data = JSON.stringify({"commandHash": hash});
		xhr.send(data);
	}
	sendServerPost(commandHash,commandObject);
	function receiveSign(sign,commandObject)
	{
		console.log("Получена подпись от сервера")
		console.log(sign)
		commandObject.serverSign=sign
		console.log(commandObject)
		sendClientPost(commandObject);
	}
	function sendClientPost(commandObject)
	{
		console.log("Отправляем на Клиент:");
		console.log(commandObject);
		console.log(JSON.stringify(commandObject));
		var xhr = new XMLHttpRequest();
		var url = CLIENT_ADDRESS;
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				receiveDataFromClient(xhr.responseText,commandObject)
			}
		};
		var data = JSON.stringify(commandObject);
		xhr.send(data);
	}
	function receiveDataFromClient(d,commandObject)
	{
		console.log("Получен ответ от клиента");
		console.log(d);
		let responseObject=JSON.parse(d);
		if(responseObject.result.success==="True")
		{
			onDone();
			onReturn(responseObject,commandObject);
		}
		else
		{
			onError();
		}
	}
}