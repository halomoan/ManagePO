sap.ui.define(["sap/ui/core/format/NumberFormat", 
	//"sap/ui/core/format/DateFormat",
	"sap/ui/core/ValueState",
	"uol/mm/ManagePO/libs/moment"], 
	
	function(NumberFormat,ValueState,momentjs) {
	"use strict";
	/* global moment:true */
	return {
	
		yyyyMMdd: function(oDate) {
			// var oDateFormat = DateFormat.getDateTimeInstance({
			// 	pattern: "yyyyMMdd"
			// });
			// return oDateFormat.format(oDate);
			var oMoment = moment(oDate);
			
			return oMoment.format("YYYYMMDD");
		},
	};
});