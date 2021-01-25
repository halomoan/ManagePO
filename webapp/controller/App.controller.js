/*global XLSX*/

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	'sap/ui/core/BusyIndicator',
	'sap/ui/export/library',
	'sap/ui/export/Spreadsheet',
	"uol/mm/ManagePO/model/formatter",

], function(Controller, MessageToast, MessageBox, BusyIndicator, exportLibrary, Spreadsheet, formatter) {
	"use strict";

	var EdmType = exportLibrary.EdmType;

	return Controller.extend("uol.mm.ManagePO.controller.App", {
		formatter: formatter,
		onInit: function() {

			var oData = {
				"Data": [{
					"PoNumber": "1",
					"DocType": "",
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
					"TrxID": "",
					"TrxStatus": "",
					"TrxMsg": ""
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
				onClose: function(sAction) {
					if (sAction === 'OK') {
						that._doSubmit();
					}
				}
			});

		},

		onShowStatus: function(oEvent) {
			var sPath = oEvent.getSource().getBindingContext("TableData").getPath();
			var oTableModel = oEvent.getSource().getModel("TableData");
			var oData = oTableModel.getProperty(sPath);

			if (oData.TrxStatus && oData.TrxStatus !== '') {
				MessageBox.information(oData.TrxMsg);
			}
		},

		onExport: sap.m.Table.prototype.exportData || function(oEvent) {
			var aCols, aData, oSettings, oSheet;
			aCols = this._createColumnConfig();
			aData = this.getView().getModel("TableData").getProperty('/Data');
			oSettings = {
				workbook: {
					columns: aCols
				},
				dataSource: aData
			};
			oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then(function() {
					MessageToast.show('Spreadsheet export has finished');
				})
				.finally(oSheet.destroy);
		},

		_doSubmit: function() {
			var oTableModel = this.getView().getModel("TableData");
			var aData = oTableModel.getData().Data;
			this._doSort(aData);

			var oData = this._mapPOHeaderData(aData);

			oTableModel.refresh();
		
			var oModel = this.getView().getModel();

			BusyIndicator.show(1);

			oModel.create("/PORootSet", oData, {
				success: function(oData, oResponse) {

					var aPOHeaders = oData.POHeaderSet.results;
					var iSearchIdx = 0;

					for (var i = 0; i < aPOHeaders.length; i++) {
						var sPoNumber = aPOHeaders[i].PoNumber;
						var sTrxID = aPOHeaders[i].TrxID
						var sTrxStatus = aPOHeaders[i].TrxStatus;
						var sTrxMsg = aPOHeaders[i].TrxMsg;

						while (iSearchIdx < aData.length) {

							if (aData[iSearchIdx].TrxID === sTrxID) {
								aData[iSearchIdx].PoNumber = sPoNumber;
								aData[iSearchIdx].TrxStatus = sTrxStatus;
								aData[iSearchIdx].TrxMsg = sTrxMsg;
							} else {
								break;
							}
							iSearchIdx++;
						} //while

					} // for
					oTableModel.refresh();
					BusyIndicator.hide();

				},
				error: function(err) {
					// some error occuerd 
					BusyIndicator.hide();
					MessageBox.information(err);
				},
				async: true, // execute async request to not stuck the main thread
				urlParameters: {} // send URL parameters if required 
			});
		},

		_mapPOHeaderData: function(aData) {

			var sDocType = null,
				sVendor = null,
				sDeliverDate = null;
			var sGUID = "1";
			var iPONumber = 0;
			var iPOItem = 0;
			var oRoot, oPOHeaderSet, oPOItemSet, oItemScheduleSet, oItemAccountSet, oPotextitemSet;

			oRoot = {
				"GUID": sGUID,
				"TrxMode": "",
				"POMode": "XX"
			};
			oRoot.POHeaderSet = {};
			oRoot.POHeaderSet.results = [];
			oRoot.POItemSet = {};
			oRoot.POItemSet.results = [];
			oRoot.ItemScheduleSet = {};
			oRoot.ItemScheduleSet.results = [];
			oRoot.ItemAccountSet = {};
			oRoot.ItemAccountSet.results = [];
			oRoot.PotextitemSet = {};
			oRoot.PotextitemSet.results = [];

			for (var i = 0; i < aData.length; i++) {
				var oData = aData[i];

				if (oData.DocType != sDocType) {
					iPONumber++;
					iPOItem = 0;

					sDocType = oData.DocType;
					sVendor = oData.VendorNo;
					sDeliverDate = oData.DeliverDate;

				} else if (oData.VendorNo != sVendor) {

					iPONumber++;
					iPOItem = 0;

					sVendor = oData.VendorNo;
					sDeliverDate = oData.DeliverDate;

				} else if (oData.DeliverDate != sDeliverDate) {

					sDeliverDate = oData.DeliverDate;
					iPONumber++;
					iPOItem = 0;

				}

				oPOHeaderSet = {};
				oPOHeaderSet.GUID = sGUID;
				oPOHeaderSet.PoNumber = "" + iPONumber;
				oPOHeaderSet.CompCode = oData.CoCode;
				oPOHeaderSet.Vendor = oData.VendorNo;
				oPOHeaderSet.PurGroup = oData.PurchGroup;
				oPOHeaderSet.Currency = oData.Curr;
				oPOHeaderSet.DocType = oData.DocType;
				oPOHeaderSet.PurchOrg = oData.PurchOrg;
				oPOHeaderSet.TrxID = "" + iPONumber;

				oRoot.POHeaderSet.results.push(oPOHeaderSet);

				oData.TrxID = "" + iPONumber;
				oData.PoNumber = "GROUPID " + iPONumber;

				oPOItemSet = {};
				oItemScheduleSet = {};
				oItemAccountSet = {};
				oPotextitemSet = {};

				iPOItem++;
				oPOItemSet.GUID = sGUID;
				oPOItemSet.PoNumber = "" + iPONumber;
				oPOItemSet.PoItem = "" + iPOItem;
				oPOItemSet.ShortText = oData.MaterialText;
				oPOItemSet.Plant = oData.Plant;
				oPOItemSet.Trackingno = oData.TrackingNo;
				oPOItemSet.MatlGroup = oData.MatGroup;
				oPOItemSet.Quantity = oData.Quantity;
				oPOItemSet.PoUnit = oData.UOM;
				oPOItemSet.NetPrice = "" + oData.NetPrice;
				oPOItemSet.PriceUnit = "" + oData.PriceUnit;
				oPOItemSet.TaxCode = oData.TaxCode;
				oPOItemSet.Acctasscat = oData.AcctAssginCat;

				oRoot.POItemSet.results.push(oPOItemSet);

				oItemScheduleSet.GUID = sGUID;
				oItemScheduleSet.PoNumber = "" + iPONumber;
				oItemScheduleSet.PoItem = "" + iPOItem;
				oItemScheduleSet.DeliveryDate = oData.DeliverDate;

				oRoot.ItemScheduleSet.results.push(oItemScheduleSet);

				oItemAccountSet.GUID = sGUID;
				oItemAccountSet.PoNumber = "" + iPONumber;
				oItemAccountSet.PoItem = "" + iPOItem;
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

				oPotextitemSet.GUID = sGUID;
				oPotextitemSet.PoNumber = "" + iPONumber;
				oPotextitemSet.PoItem = "" + iPOItem;
				oPotextitemSet.TextId = "F01";
				oPotextitemSet.TextForm = "";
				oPotextitemSet.TextLine = oData.MatLongText;

				oRoot.PotextitemSet.results.push(oPotextitemSet);

			}

			return oRoot;

		},

		_doSort: function(aData) {
			aData.sort(function(value1, value2) {
				if (value1.DocType == value2.DocType) {
					if (value1.VendorNo == value2.VendorNo) {
						return (value1.DeliverDate < value2.DeliverDate) ? -1 : (value1.DeliverDate > value2.DeliverDate) ? 1 : 0;
					} else {
						return (value1.VendorNo < value2.VendorNo) ? -1 : 1;
					}
				} else {
					return (value1.DocType < value2.DocType) ? -1 : 1;
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

				item.TrackingNo = item.TrackingNo.substring(0, 10);
				item.DeliverDate = this.formatter.yyyyMMdd(item.DeliverDate);
				item.NetPrice = parseFloat(item.NetPrice.replace(/,/g, ""), 0);
				item.PriceUnit = parseFloat(item.PriceUnit.replace(/,/g, ""), 0);

			})
		},
		_createColumnConfig: function() {

			var aData = this.getView().getModel("TableData").getProperty('/Data/0');
			var aColumns = [];
			for (var key in aData) {
				aColumns.push({
					label: key,
					property: key,
					type: EdmType.String,
					scale: 0
				})
			}

			return aColumns;
		},

	});
});