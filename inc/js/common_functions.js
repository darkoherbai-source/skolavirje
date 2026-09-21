function move_attachment(direction, ord, id, news_id){
	var req = new Request({
		method: 'get',
		url: '?only_module=mod_news&news_id='+news_id+'&move_direction='+direction+'&ord='+ord+'&id='+id,
		//data: postData,  
		onSuccess: function(txt){
			$('result').empty();
			$('result').set('html', txt);
		}

	});
	req.send();
}