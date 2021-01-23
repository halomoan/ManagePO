/*global XLSX*/

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"uol/mm/ManagePO/model/formatter",

], function(Controller, MessageToast, MessageBox, formatter) {
	"use strict";

	return Controller.extend("uol.mm.ManagePO.controller.App", {
		formatter: formatter,
		onInit: function() {

			var oData = {
				"Data": [{
					"PONo": "1",
					"TrackingNo": "",
					"VendorNo": "1000009184",
					"Vendor": "STR GLOBAL LIMITED",
					"Curr": "SGD",
					"CoCode": "",
					"Plant": "",
					"PurchOrg": "",
					"PurchGroup": "",
					"AcctAssginCat": "",
					"MaterialText": "",
					"MatLongText": "",
					"Quantity": "",
					"UOM": "",
					"TaxCode": "",
					"DeliverDate": "",
					"NetPrice": "",
					"PriceUnit": "",
					"MatGroup": "",
					"IntOrderNo": "",
					"AssetNo": "",
					"CostCtr": "",
					"GLAccount": "",
					"GoodsRCPT": "",
					"UnloadPt": "",
					"TrxID": ""
				}]
			};

			var oModel = new sap.ui.model.json.JSONModel(oData);
			this.getView().setModel(oModel, "TableData");
		},
		onUpload: function(e) {
			this._import(e.getParameter("files") && e.getParameter("files")[0]);

		},
		_import: function(file) {
			var that = this;
			var excelData = {};
			if (file && window.FileReader) {
				var reader = new FileReader();
				reader.onload = function(e) {
					var data = e.target.result;
					var workbook = XLSX.read(data, {
						type: 'binary'
					});
					workbook.SheetNames.forEach(function(sheetName) {
						// Here is your object for every sheet in workbook
						if (sheetName === 'Sheet1') {
							//excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
							excelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
						}

					});

					//Skip Headers
					excelData.shift();
					excelData.shift();
					excelData.shift();

					if (that._validate(excelData)) {

						that._transform(excelData);

						var oModel = that.getView().getModel("TableData");
						oModel.setData({
							"Data": excelData
						});
						oModel.refresh(true);

					}

				};
				reader.onerror = function(ex) {
					console.log(ex);
				};
				reader.readAsBinaryString(file);
			}
		},

		onAddItem: function(oEvent) {
			var aIndices = this.byId("poTable").getSelectedIndices();

			var oModel = this.getView().getModel("TableData");
			var aData = oModel.getData().Data;
			var iLastIdx = aData.length - 1;

			var sMsg;
			if (aIndices.length < 1) {
				aIndices = [iLastIdx];
				sMsg = "Added by copying last row";
			} else {
				sMsg = aIndices;
				sMsg = "Added by copying selected row(s)";
			}

			for (var i = 0; i < aIndices.length; i++) {
				var oData = Object.assign({}, aData[aIndices[i]]);
				aData.push(oData);

			}

			oModel.refresh();

			this.byId("poTable").clearSelection();
			MessageToast.show(sMsg);
		},

		onDeleteItem: function(oEvent) {
			var aIndices = this.byId("poTable").getSelectedIndices();

			var oModel = this.getView().getModel("TableData");
			var aData = oModel.getData().Data;
			var sMsg;

			if (aIndices.length < 1) {
				sMsg = "No rows were selected";
			} else {

				for (var i = aIndices.length - 1; i >= 0; i--) {
					aData.splice(aIndices[i], 1);
				}
				oModel.refresh();
				this.byId("poTable").clearSelection();
				sMsg = "Removed";
			}

			MessageToast.show(sMsg);
		},
		onSubmit: function(oEvent) {
			var that = this;
		
			MessageBox.confirm("Are You Sure To Create The PO(s) ?", {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.CANCEL,
				onClose: function (sAction) {
					if (sAction === 'OK') {
						MessageToast.show("Action selected: " + sAction);
						that._doSubmit();
					}
				}
			});
			
			
		},
		
		_doSubmit: function(){
			var oTableModel = this.getView().getModel("TableData");
			var aData = oTableModel.getData().Data;
			this._doSort(aData);
			
			oTableModel.refresh();
			
			var oData = this._mapPOHeaderData(aData);
			
			var oModel = this.getView().getModel();
			
			
			
			
			oModel.create("/UserCollection",oData,{
			    success: function(oData,oResponse){
			        console.log(oData,oResponse);
			    },
			    error: function(err){
			        // some error occuerd 
			    },
			    async: true,  // execute async request to not stuck the main thread
			    urlParameters: {}  // send URL parameters if required 
			});
		},
		
		_mapPOHeaderData: function(aData) {
			
			var sVendor = null, sDeliverDate = null;
			var iPONumber = 0;
			var iPOItem = 0;
			var oRoot, oPOHeaderSet,oPOItemSet,oItemScheduleSet,oItemAccountSet,oPotextitemSet;
			
			oRoot = {
				"GUID" : "1",
        		"TrxMode" : "",
        		"POMode" : "XX"
			};
			oRoot.POHeaderSet = {}; oRoot.POHeaderSet.results = [];
			oRoot.POItemSet = {}; oRoot.POItemSet.results = [];
			oRoot.ItemScheduleSet = {}; oRoot.ItemScheduleSet.results = [];
			oRoot.ItemAccountSet = {}; oRoot.ItemAccountSet.results = [];
			oRoot.PotextitemSet = {}; oRoot.PotextitemSet.results = [];
					
					
			
			for(var i = 0; i < aData.length; i++){
				var oData = aData[i];
				
				if (oData.VendorNo != sVendor){
					
				
					iPONumber++;
					iPOItem = 0;
					
					sVendor = oData.VendorNo;
					sDeliverDate = oData.DeliverDate;
					
					
					oPOHeaderSet = {};
					oPOHeaderSet.PoNumber = iPONumber;
					oPOHeaderSet.CompCode = oData.CoCode;
					oPOHeaderSet.Vendor = oData.VendorNo;
					oPOHeaderSet.PurGroup = oData.PurchGroup;
					oPOHeaderSet.Currency = oData.Curr;
					oPOHeaderSet.DocType = "NB";
					oPOHeaderSet.PurchOrg = oData.PurchOrg;
					oPOHeaderSet.TrxID = iPONumber;
					
					
					
					oRoot.POHeaderSet.results.push(oPOHeaderSet);

				
				} else if ( oData.DeliverDate != sDeliverDate){
					
					sDeliverDate = oData.DeliverDate;
					iPONumber++;
					iPOItem = 0;
				
					oPOHeaderSet = {};
					oPOHeaderSet.PoNumber = iPONumber;
					oPOHeaderSet.CompCode = oData.CoCode;
					oPOHeaderSet.Vendor = oData.VendorNo;
					oPOHeaderSet.PurGroup = oData.PurchGroup;
					oPOHeaderSet.Currency = oData.Curr;
					oPOHeaderSet.DocType = "NB";
					oPOHeaderSet.PurchOrg = oData.PurchOrg;
					oPOHeaderSet.TrxID = iPONumber;
					
					oRoot.POHeaderSet.results.push(oPOHeaderSet);
				
				}
					
					oData.TrxID = iPONumber;		
					
					oPOItemSet = {};
					oItemScheduleSet = {};
					oItemAccountSet = {};
					oPotextitemSet = {};
					
					iPOItem++;
					oPOItemSet.PoNumber = iPONumber;
					oPOItemSet.PoItem = iPOItem;
					oPOItemSet.ShortText = oData.MaterialText;
					oPOItemSet.Plant = oData.Plant;
					oPOItemSet.Trackingno = oData.TrackingNo;
					oPOItemSet.MatlGroup = oData.MatGroup;
					oPOItemSet.Quantity = oData.Quantity;
					oPOItemSet.PoUnit = oData.UOM;
					oPOItemSet.NetPrice = oData.NetPrice;
					oPOItemSet.PriceUnit = oData.PriceUnit;
					oPOItemSet.TaxCode = oData.TaxCode;
					oPOItemSet.Acctasscat = oData.AcctAssginCat;
					
					oRoot.POItemSet.results.push(oPOItemSet);
					
					oItemScheduleSet.PONumber = iPONumber;
					oItemScheduleSet.PoItem = iPOItem;
					oItemScheduleSet.DeliveryDate = oData.DeliverDate;
					
					oRoot.ItemScheduleSet.results.push(oItemScheduleSet);
					
					
					oItemAccountSet.PoNumber = iPONumber;
					oItemAccountSet.PoItem = iPOItem;
					oItemAccountSet.GlAccount = oData.GLAccount;
					oItemAccountSet.AssetNo = oData.AssetNo;
					oItemAccountSet.SubNumber = '0000';
					oItemAccountSet.Orderid = oData.IntOrderNo;
					oItemAccountSet.GrRcpt = oData.GoodsRCPT;
					oItemAccountSet.UnloadPt = oData.UnloadPt;
					oItemAccountSet.CoArea = '1000';
					oItemAccountSet.ProfitCtr = "";
					oItemAccountSet.Costcenter = oData.CostCtr;
					
					oRoot.ItemAccountSet.results.push(oItemAccountSet);
					
					oPotextitemSet.PoNumber = iPONumber;
					oPotextitemSet.PoItem = iPOItem;
					oPotextitemSet.TextId = "F01";
					oPotextitemSet.TextForm = "";
					oPotextitemSet.TextLine = oData.MatLongText;
					
					oRoot.PotextitemSet.results.push(oPotextitemSet);
					
				}
				
				return oRoot;
				
		},

		_doSort: function(aData){
			aData.sort(function(value1,value2){
				
				if(value1.VendorNo == value2.VendorNo)
			    {
			        return (value1.DeliverDate < value2.DeliverDate) ? -1 : (value1.DeliverDate > value2.DeliverDate) ? 1 : 0;
			    }
			    else
			    {
			        return (value1.VendorNo < value2.VendorNo) ? -1 : 1;
			    }
			});	
			
			
		},
		// _assignTrxID: function(aData){
		// 	var sVendor, sDeliverDate;
		// 	var iTrxID = 0; 
		// 	for(var i = 0; i < aData.length; i++){
		// 		var oData = aData[i];
				
		// 		if (oData.VendorNo != sVendor){
		// 			iTrxID = iTrxID + 1;
		// 			oData.TrxID = iTrxID;
					
		// 			sVendor = oData.VendorNo;
		// 			sDeliverDate = oData.DeliverDate;
					

				
		// 		} else if ( oData.DeliverDate != sDeliverDate){
					
		// 			iTrxID = iTrxID + 1;
		// 			oData.TrxID = iTrxID;
					
		// 			sDeliverDate = oData.DeliverDate;
				
		// 		} else {
		// 			oData.TrxID = iTrxID;
		// 		}
		// 	}			
		// },
		_validate: function(aExcelData) {
			if (aExcelData && aExcelData.length < 1) {
				return false;
			}
			return true;
		},
		_transform: function(aExcelData) {
			aExcelData.map((item) => {
				
				for (var key in item) {
					item[key] = item[key].trim();
				}
				
				item.DeliverDate = this.formatter.yyyyMMdd(item.DeliverDate);
				item.NetPrice = parseFloat(item.NetPrice.replace(/,/g, ""), 0);
				item.PriceUnit = parseFloat(item.PriceUnit.replace(/,/g, ""), 0);

			})
		}

	});
});