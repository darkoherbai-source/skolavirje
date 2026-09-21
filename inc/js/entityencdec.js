function EntEncode(str) {
	var result = "";
	var i = 0;

	for (i=0; i < str.length; i++) {
	var c = str.charCodeAt(i);
	var tmp = "";

	while (c >= 1) {
		tmp = "0123456789".charAt(c % 10) + tmp;
		c = c / 10;
	}

	if (tmp == "")
		tmp = "0";

		tmp = "#" + tmp;
		tmp = "&" + tmp;
		tmp = tmp + ";";

		result += tmp;
	}

	return result;
}
