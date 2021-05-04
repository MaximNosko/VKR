let CLIENT_ADDRESS="http://localhost:49053/";
async function runSRPCommand(appID,type,args,signURL,onWaiting,onDone,onError,onReturn)
{
	//функция для отправки команды Клиенту СРП
    //appID - идентификатор приложения
    //type - тип команды
    //args - объект, содержащий в себе аргументы команды
    //signURL - адрес, по которому можно осуществить подпись хеша команды
	//onWaiting - функция, которая будет вызвана во время ожидания завершения команды, аргументы не передаются
	//onDone - функция, которая будет вызвана при успешном завершении команды, аргументы не передаются
	//onError - функция, которая будет вызвана при неуспешном завершении команды, аргументы не передаются
	//onReturn - функция, которая будет вызвана при успешном завершении, в качестве аргументов передаются объект результата выполнения команды и объект команды
	onWaiting();//ожидание выполнения команды
	args.path=encodeURIComponent(args.path.replaceAll("\\", "/"));//замена в пути всех обратных слешей на обычные
	let commandObject={};//создание объекта команды
	function getReadCommandObject(args,APP_ID)//функция для создания объекта команды на чтение
	{
		return {"type":"read","args":{"path":args.path},"appID":APP_ID};
	}
	function getWriteCommandObject(args,APP_ID)//функция для создания объекта команды на запись
	{
		return {"type":"write","args":{"path":args.path,"bytes":args.bytes},"appID":APP_ID};
	}
	function getListCommandObject(args,APP_ID)//функция для создания объекта команды на получение списка файлов
	{
		return {"type":"list","args":{"path":args.path},"appID":APP_ID};
	}
	function getDeleteCommandObject(args,APP_ID)//функция для создания объекта команды на удаление
	{
		return {"type":"delete","args":{"path":args.path},"appID":APP_ID};
	}
	function getMkDirCommandObject(args,APP_ID)//функция для создания объекта команды на создание папки
	{
		return {"type":"mkdir","args":{"path":args.path},"appID":APP_ID};
	}
	function getRenameCommandObject(args,APP_ID)//функция для создания объекта команды на переименование
	{
		args.newName=encodeURIComponent(args.newName);
		return {"type":"rename","args":{"path":args.path,"newName":args.newName},"appID":APP_ID};
	}
	//перебор значений type c вызовом нужных функций
	if(type==="read")
	{
		commandObject=getReadCommandObject(args,appID);
	}
	if(type==="write")
	{
		commandObject=getWriteCommandObject(args,appID);
	}
	if(type==="list")
	{
		commandObject=getListCommandObject(args,appID);
	}
	if(type==="delete")
	{
		commandObject=getDeleteCommandObject(args,appID);
	}
	if(type==="mkdir")
	{
		commandObject=getMkDirCommandObject(args,appID);
	}
	if(type==="rename")
	{
		commandObject=getRenameCommandObject(args,appID);
	}
	function getSortedObject(uObj)//фунекция для сортировки содержимого объекта команды
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
	commandObject=getSortedObject(commandObject);//сортировка объекта команты
	async function sha256(message) {//функция для вычисления хеша SHA256
		const msgBuffer = new TextEncoder().encode(message);                    
		const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));            
		const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		return hashHex;
	}
	async function getHash(commandObject)//функция для вычисления хеша SHA256 для объекта команды
	{
		console.log("json");
		console.log(JSON.stringify(commandObject))
		console.log("sha256")
		let t=await sha256(JSON.stringify(commandObject));
		console.log(t)
		return t;
	}
	let commandHash=await getHash(commandObject);//вычисление хеша объекта команды
	function sendServerPost(hash,commandObject)//функция для отправки на сервер веб-приложения хеша на подпись
	{
		var xhr = new XMLHttpRequest();
		var url = signURL;
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				receiveSign(xhr.responseText,commandObject);//вызов функции получения подписи
			}
		};
		var data = JSON.stringify({"commandHash": hash});
		xhr.send(data);
	}
	sendServerPost(commandHash,commandObject);//отправка хеша на подпись
	function receiveSign(sign,commandObject)//функция для получения подписи
	{
		console.log("Получена подпись от сервера")
		console.log(sign)
		commandObject.serverSign=sign//добавление подписи в объект команды
		console.log(commandObject)
		sendClientPost(commandObject);//отправка команды Клиенту СРП
	}
	function sendClientPost(commandObject)//функция для отправки команды
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
				receiveDataFromClient(xhr.responseText,commandObject)//вызов функции получения данных от Клиента СРП
			}
		};
		var data = JSON.stringify(commandObject);
		xhr.send(data);
	}
	function receiveDataFromClient(d,commandObject)//функции для получения данных от Клиента СРП
	{
		console.log("Получен ответ от клиента");
		console.log(d);
		let responseObject=JSON.parse(d);
		if(responseObject.auth==="True")
		{
			if(responseObject.result.success==="True")
			{
				onDone();//команда завершилась удачно
				onReturn(responseObject,commandObject);//сообщение результата успешного выполнения команды веб-приложению
			}
			else
			{
				onError();//команда была завершена неудачно
			}
		}
		else
		{
			onError();//команда была завершена неудачно
		}
		
	}
}