//var file_types = {
//    xls:"application/vnd.ms-excel",
//    xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};

// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {

// ---  set selected menu button active
    const cls_active = "active";
    const cls_hover = "tr_hover";
    //const cls_selected = "c_table_stud_thead_td_selectedXX";

    const cls_unlinked = "tsa_td_unlinked"
    const cls_linked =  "tsa_td_linked"
    const cls_unlinked_selected = "tsa_td_unlinked_selected"
    const cls_linked_selected =  "tsa_td_linked_selected"

    const cls_tbl_td_unlinked = "tsa_td_unlinked";
    const cls_columns_header = "c_columns_header";
    const cls_tbl_td_linked = "tsa_td_linked";
    const cls_cell_saved_even = "cell_saved_even";
    const cls_cell_saved_odd = "cell_saved_odd";
    const cls_cell_unchanged_even = "cell_unchanged_even";
    const cls_cell_unchanged_odd = "cell_unchanged_odd";

    const cls_cell_error_even = "cell_error_even";
    const cls_cell_error_odd = "cell_error_odd";


    const cls_ea_flex = "ea_flex";
    const cls_li_flex= "li_flex";

    const cls_hide = "display_hide";

    const cls_visible_hide = "visibility_hide";
    const cls_btn_selected = "tsa_btn_selected";

    const file_types = {
        xls:"application/vnd.ms-excel",
        xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    let btn_clicked = document.getElementById("id_sub_empl_imp");
    SetMenubuttonActive(btn_clicked);

// set global variables
    let div_info = document.getElementById('div_infoID');
    let para = document.createElement('p');


// locale_dict with translated text
    let loc = {};
    let el_loader = document.getElementById("id_loader");

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
    const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");

    let selected_file = null;
    let workbook;
    let worksheet;
    let worksheet_range;
    let worksheet_data = [];
    let excel_columns = [];
    let excel_dateformat = null;
    let has_linked_datefields = false;

    let stored_coldefs = {};
    let stored_has_header = true;
    let stored_worksheetname = "";
    let stored_code_calc = "";
    let selected_worksheetname = stored_worksheetname;
    let selected_btn = "btn_step1";

    let el_tbody_tsa = document.getElementById("id_tbody_tsa");
    let el_tbody_exc = document.getElementById("id_tbody_exc");
    let el_tbody_lnk = document.getElementById("id_tbody_lnk");

    let tblHead = document.getElementById('id_thead');
    let tblBody = document.getElementById('id_tbody');
    let tblFoot = document.getElementById('id_tfoot');

// --- addEventListener to buttons in prev next, btn_upload
    let el_btn_mod_prev = document.getElementById("id_btn_mod_prev")
    if(!!el_btn_mod_prev){el_btn_mod_prev.addEventListener("click", function() {HandleBtnPrevNext("prev")}, false)};
    let el_btn_mod_next = document.getElementById("id_btn_mod_next")
    if(!!el_btn_mod_next){el_btn_mod_next.addEventListener("click", function() {HandleBtnPrevNext("next")}, false)};
    let el_btn_upload = document.getElementById("id_btn_upload")
    if(!!el_btn_upload){el_btn_upload.addEventListener("click", function() {ModConfirmOpen() }, false)};
    let el_btn_test = document.getElementById("id_btn_test")
    if(!!el_btn_test){el_btn_test.addEventListener("click", function() {UploadData(true)}, false)};

// --- create EventListener for buttons in btn_container
    let btns = document.getElementById("id_btn_container").children;
    for (let i = 0, btn; btn = btns[i]; i++) {
        const data_btn = get_attr_from_el(btn,"data-btn")
        btn.addEventListener("click", function() {HandleBtnSelect(data_btn, false)}, false )
    }

// --- create EventListener for select dateformat element
    const el_filedialog = document.getElementById("id_filedialog");
        el_filedialog.addEventListener("change", HandleFiledialog, false);
    const el_worksheet_list = document.getElementById("id_worksheet_list");
        el_worksheet_list.addEventListener("change", HandleWorksheetList, false);
    const checkbox_hasheader = document.getElementById("checkBoxID");
        checkbox_hasheader.addEventListener("change", HandleCheckboxHasheaderChanged) //, false);
    const el_select_code_calc = document.getElementById("id_select_code_calc");
        el_select_code_calc.addEventListener("change", HandleSelectCodeCalc, false);
    const el_select_dateformat = document.getElementById("id_select_dateformat");
        el_select_dateformat.addEventListener("change", function() {HandleSelectdateformat(el_select_dateformat)}, false )

// --- create EventListener for mod confirm
    const el_confirm_btn_save = document.getElementById("id_confirm_btn_save")
        el_confirm_btn_save.addEventListener("click", function() {ModConfirmSave()}, false )

    HandleBtnPrevNext()

// ---  download settings and datalists
    const now_arr = get_now_arr();
    const datalist_request = {
        setting: {page_employeeupload: {mode: "get"}},
        companysetting: {coldefs: "employee"},
        locale: {page: "upload"}
    };
    DatalistDownload(datalist_request, "DOMContentLoaded");

//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++
//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, called_by) {
        console.log( "=== DatalistDownload ", called_by)
        console.log("datalist_request: ", datalist_request)

// ---  show loader
        el_loader.classList.remove(cls_visible_hide)

        let param = {"download": JSON.stringify (datalist_request)};
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
                console.log("response")
                console.log(response);
                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                }
                if ("companysetting_dict" in response) {
                    UpdateSettingsImport(response["companysetting_dict"])
                }

// --- hide loader
                el_loader.classList.add(cls_visible_hide)
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
            }
        });  // $.ajax({
    }

//=========   HandleFiledialog   ======================
    function HandleFiledialog() { // functie wordt alleen doorlopen als file is geselecteerd
        //console.log(" ========== HandleFiledialog ===========");

// ---  get curfiles from filedialog
        // curfiles is list of files: PR2020-04-16
        // curFiles[0]: {name: "tsa_import_orders.xlsx", lastModified: 1577989274259, lastModifiedDate: Thu Jan 02 2020 14:21:14 GMT-0400 (Bolivia Time) {}
       // webkitRelativePath: "", size: 9622, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}, length: 1}
        let curFiles = el_filedialog.files; //This one doesn't work in Firefox: var curFiles = event.target.files;

// ---  validate selected file
        selected_file = null;
        excel_columns = [];
        excel_dateformat = null;
        has_linked_datefields = false;
        worksheet_data = [];
        let msg_err = null
        if(curFiles.length === 0) {
            msg_err = loc.Select_valid_Excelfile;
        } else  if(!is_valid_filetype(curFiles[0])) {
                msg_err = loc.Not_valid_Excelfile + " " + loc.Only + ".xls " + loc.and + ".xlsx" + loc.are_supported;
        } else {
            selected_file = curFiles[0];
        }

// ---  display error message when error
        let el_msg_err = document.getElementById("id_msg_filedialog")
        el_msg_err.innerText = msg_err;
        show_hide_element(el_msg_err, (!!msg_err));

        GetWorkbook();
    }  // HandleFiledialog

//=========  GetWorkbook  ====================================
    function GetWorkbook() {
        console.log("======  GetWorkbook  =====" + selected_file );
        workbook = null;
        worksheet = null;
        worksheet_range = null;
        worksheet_data = [];
        selected_worksheetname = "";
        if(!!selected_file){
            let reader = new FileReader();
            let rABS = false; // false: readAsArrayBuffer,  true: readAsBinaryString
            if (rABS) {reader.readAsBinaryString(selected_file);} else {reader.readAsArrayBuffer(selected_file);}
           // PR2017-11-08 debug: reader.onload didn't work when reader.readAsBinaryString was placed after reader.onload

// ---  read file into workbook
            // PR2018-12-09 debug: leave functions that depend on reading file within onload.
            // This way code executing stops till loading has finished.
            // Otherwise use Promise. See: https://javascript.info/promise-basics
            reader.onload = function(event) {
                let data = event.target.result;
                if(!rABS) { data = new Uint8Array(data);}
                switch (selected_file.type) {
                    case file_types.xls:
                        workbook = XLS.read(data, {type: rABS ? "binary" : "array"});
                        break;
                    default:
                        workbook = XLSX.read(data, {type: rABS ? "binary" : "array"});
                }
// ---  make list of worksheets in workbook
                if (!!workbook){
                    let msg_err = null
// ---  reset el_worksheet_list.options
                    el_worksheet_list.options.length = 0;
// ---  give message when workbook has no worksheets, reset selected_worksheetname
                    if (!workbook.SheetNames.length) {
                        msg_err = loc.No_worksheets;
                    } else {
// ---  fill el_worksheet_list.options with sheets that are not empty
                        for (let x=0, sheetname; sheetname = workbook.SheetNames[x]; ++x){
// ---  if workbook.SheetNames[x] has range: add to el_worksheet_list
                            if (SheetHasRange(workbook.Sheets[sheetname])) {
                                let option = document.createElement("option");
                                option.value = sheetname;
                                //option.innerHTML = sheetname;
                                option.innerText = sheetname;
// ---  make selected if name equals stored_worksheetname
                                if (!!stored_worksheetname) { // if x = '' then !!x evaluates to false.
                                    if(sheetname.toLowerCase() === stored_worksheetname.toLowerCase() ){
                                        option.selected = true;
                                        selected_worksheetname = sheetname;
                                }}
                                el_worksheet_list.appendChild(option);
                            }
                        } //for (let x=0;
// ---  give message when no data in worksheets
                        if (!el_worksheet_list.options.length){
                            msg_err = loc.No_worksheets_with_data;
                        } else {
// ---  if only one sheet exists: make selected = True
                            if (el_worksheet_list.options.length === 1){
                                el_worksheet_list.options[0].selected = true;
                                selected_worksheetname = el_worksheet_list.options[0].value;
                            }
                        };
// ---  get selected worksheet, if any
                        if(!!selected_worksheetname){
                            worksheet = workbook.Sheets[selected_worksheetname];
                            if(!!worksheet){
// ---  get Column and Rownumber of upper left cell and lower right cell of SheetRange
                                worksheet_range = GetSheetRange (worksheet);
                                if (!!worksheet_range) {
// ---  set checkbox_hasheader checked
                                    checkbox_hasheader.checked = stored_has_header;
// ---  set el_select_code_calc
                                    el_select_code_calc.value = stored_code_calc;
// ---  fill worksheet_data with data from worksheet
                                    worksheet_data = FillWorksheetData(worksheet, worksheet_range, stored_has_header);
// ---  fill table excel_columns
                                    FillExcelColumsArray();
                                    FillTsaExcelLinkTables()
// ---  fill DataTable
                                    FillDataTable(worksheet_range);
                                    UpdateDatatableHeader();
// ---  upload new settings tsaCaption
                                    UploadSettingsImport ("workbook");
                    }}}}
                    let el_msg_err = document.getElementById("id_msg_worksheet")
                    el_msg_err.innerText = msg_err;
                    show_hide_element(el_msg_err, (!!msg_err));
                }  // if (!!workbook){
                // PR2020-04-16 debug: must be in reader.onload, will not be reachted when ik HandleFiledialog
                HighlightAndDisableSelectedButton("GetWorkbook");
            }; // reader.onload = function(event) {
        }; // if(!!selected_file){
    }  // function GetWorkbook())

//=========  HandleWorksheetList   ======================
    function HandleWorksheetList() {
        console.log(" ========== HandleWorksheetList ===========");
        if(!!workbook){
            if(!!el_worksheet_list.value){
                selected_worksheetname = el_worksheet_list.value;
// ---  get selected worksheet
                worksheet = workbook.Sheets[selected_worksheetname];
                if(!!worksheet){
// ---  get Column and Rownumber of upper left cell and lower right cell of SheetRange
                    worksheet_range = GetSheetRange (worksheet);
                    if (!!worksheet_range) {
// ---  set checkbox_hasheader checked
                        checkbox_hasheader.checked = stored_has_header;
// ---  fill worksheet_data with data from worksheet
                        worksheet_data = FillWorksheetData(worksheet, worksheet_range, stored_has_header);
                        const show_data_table = (!!worksheet_data.length)
                        let el = document.getElementById("")
// ---  fill table excel_columns
                        FillExcelColumsArray();
                        FillTsaExcelLinkTables();
// ---  fill DataTable
                        FillDataTable(worksheet_range);
                        UpdateDatatableHeader();
// ---  upload new settings
                        UploadSettingsImport ("worksheetlist");
            }}}
        }
        HighlightAndDisableSelectedButton("HandleWorksheetList");
    }  // HandleWorksheetList()

//=========   HandleCheckboxHasheaderChanged   ======================
    function HandleCheckboxHasheaderChanged() {
console.log(" ========== HandleCheckboxHasheaderChanged ===========");
        if(!!worksheet && !!worksheet_range) {
            stored_has_header = checkbox_hasheader.checked;
// ---  fill worksheet_data with data from worksheet
            worksheet_data = FillWorksheetData(worksheet, worksheet_range, stored_has_header);
// ---  fill table excel_columns
            FillExcelColumsArray();
            FillTsaExcelLinkTables();
// ---  fill DataTable
            FillDataTable(worksheet_range);
            UpdateDatatableHeader();
            // upload new settings tsaCaption
            UploadSettingsImport ("hasheader");
        }  // if(!!worksheet){
    }; //HandleCheckboxHasheaderChanged

//=========   HandleSelectCodeCalc   ======================
    function HandleSelectCodeCalc() {
        console.log("=========   HandleSelectCodeCalc   ======================") ;
        HighlightAndDisableSelectedButton("HandleSelectCodeCalc")
        UploadSettingsImport ("HandleSelectCodeCalc");
    }  // HandleSelectCodeCalc

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                 ExcelFile_Read
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  fill worksheet_data  ========================================================================
    function FillWorksheetData(work_sheet, sheet_range, has_header) {
    // fills the list 'worksheet_data' with data from 'worksheet'
        let sheet_data = [];
        let row = sheet_range.StartRowNumber;
        // skip first row when first row is header row
        if (has_header) {++row;};
        for (; row<=sheet_range.EndRowNumber; ++row){
            let NewRow = [];
            for (let col=sheet_range.StartColNumber; col <= sheet_range.EndColNumber; ++col){
                let CellName = GetCellName (col,row);
                let CellValue = GetExcelValue(work_sheet, CellName,"w");
                NewRow.push (CellValue);
            };
            sheet_data.push (NewRow);
        }

        return sheet_data;
    }  // FillWorksheetData

//=========  FillExcelColumsArray  ===========
    function FillExcelColumsArray() {
        //console.log("=========  FillExcelColumsArray ========= ");
        let colindex;
        let itemlist =[];
        excel_columns = [];
        excel_dateformat = null;
        has_linked_datefields = false;
// ---  create array 'excel_columns' with Excel column names, replaces spaces, ", ', /, \ and . with _
        if(!!worksheet && !!worksheet_range) {
// ---  get headers if Not SelectedSheetHasNoHeader: from first row, otherwise: F01 etc ");
            let row_number = worksheet_range.StartRowNumber;
            for (let col_number=worksheet_range.StartColNumber, idx = 0, colName = ""; col_number<=worksheet_range.EndColNumber; ++col_number){
                if (stored_has_header){
                    const cellName = GetCellName (col_number,row_number);
                    const excValue = GetExcelValue(worksheet, cellName,"w");
                    colName = replaceChar(excValue);
                } else {
                    const index = "00" + col_number;
                    colName = "F" + index.slice(-2);
                }
                excel_columns.push ({index: idx, excKey: colName});
                idx += 1;
        }}
// =======  Map array 'excel_columns' with 'stored_coldefs' =======
        // function loops through stored_coldefs and excel_columns and add links and caption in these arrays
        // stored_coldefs: [ {tsaKey: "idnumber", caption: "ID nummer", excKey: "ID"}, 1: ...]
        // excel_columns: [ {index: 10, excKey: "ID", tsaKey: "idnumber", tsaCaption: "ID nummer"}} ]
// ---  loop through array stored_coldefs
        if(!!stored_coldefs) {
            for (let i = 0, stored_row; stored_row = stored_coldefs[i]; i++) {
                // stored_row = {tsaKey: "orderdatelast", caption: "Einddatum opdracht"}
                let is_linked = false;
                if (!!stored_row.tsaKey && !!stored_row.excKey){
// ---  check if excKey also exists in excel_columns
                    let excel_row_byKey = get_arrayRow_by_keyValue(excel_columns, "excKey", stored_row.excKey);
// ---  if excKey is found in excel_columns: add tsaKey and tsaCaption to excel_row
                    if (!!excel_row_byKey){
                        excel_row_byKey.tsaKey = stored_row.tsaKey;
                        excel_row_byKey.tsaCaption = stored_row.caption;
                        is_linked = true;
                    } else {
// ---  if excKey is not found in excel_columns remove excKey from stored_row
                        delete stored_row.excKey;
                }}
// ---  if column not linked, check if TsaCaption and Excel name are the same, if so: link anyway
                if (!is_linked){
                    let excel_row_byCaption = get_arrayRow_by_keyValue (excel_columns, "excKey", stored_row.caption)
                    if (!!excel_row_byCaption){
                        stored_row.excKey = excel_row_byCaption.excKey;
                        excel_row_byCaption.tsaKey = stored_row.tsaKey;
                        excel_row_byCaption.tsaCaption = stored_row.caption;
                        is_linked = true;
                }}
            };
        }
        // ---  detect dateformat of fields: 'datefirst', 'datelast' PR2020-06-04
        // has_linked_datefields and excel_dateformat are global variables, are set in get_excel_dateformat
        get_excel_dateformat(["datefirst", "datelast"]);


    }  // FillExcelColumsArray

//=========  FillDataTable  ========================================================================
    function FillDataTable(sheet_range) {
        console.log("=========  function FillDataTable =========");
//--------- delete existing rows
        tblHead.innerText = null
        tblBody.innerText = null
        const no_excel_data = (!worksheet_data || !excel_columns);
        if (!no_excel_data){
//--------- insert tblHead row of datatable
            let tblHeadRow = tblHead.insertRow();
            //PR2017-11-21 debug: error when StartColNumber > 1, j must start at 0
            //var EndIndexPlusOne = (sheet_range.EndColNumber) - (sheet_range.StartColNumber -1)
            //index j goes from 0 to ColCount-1, excel_columns index starts at 0, last index is ColCount-1
            for (let j = 0 ; j <sheet_range.ColCount; j++) {
                let cell = tblHeadRow.insertCell(-1);
                let excKey = excel_columns[j].excKey;
                cell.innerHTML = excKey;
                cell.setAttribute("id", "idTblCol_" + excKey);
            };
// ---  insert DataSet rows
            let LastRowIndex = sheet_range.RowCount -1;
            // worksheet_data has no header row, start allways at 0
            if (stored_has_header) { --LastRowIndex;}
            //if (EndRow-1 < EndRowIndex) { EndRowIndex = EndRow-1;};
// ---  insert row
            for (let i = 0; i <= LastRowIndex; i++) {
                let tblRow = tblBody.insertRow(-1);
                tblRow.setAttribute("data-row_index", tblRow.rowIndex );
// ---  alternate row background color
                class_background = (i%2 === 0) ? cls_cell_unchanged_even : cls_cell_unchanged_odd;
                tblRow.classList.add(class_background);
// ---  insert cells
                for (let j = 0 ; j < sheet_range.ColCount; j++) {
                    let cell = tblRow.insertCell(-1);
                    if(!!worksheet_data[i][j]){
                        cell.innerHTML = worksheet_data[i][j];
                    };
                } //for (let j = 0; j < 2; j++)
            } //for (let i = 0; i < 2; i++)
        }; // if(has_data){
    };  //  FillDataTable

//========= is_valid_filetype  ====================================
    function is_valid_filetype(File) {
        // MIME xls: application/vnd.ms-excel
        // MIME xlsx: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        // MIME csv: text/csv

        var is_valid = false
        for (let prop in file_types) {
            if (file_types.hasOwnProperty(prop)) {
                if(File.type === file_types[prop]) {
                    is_valid = true;
                    break;
        }}}
        return is_valid;
    }

//========= GetSheetRange  ====================================
    function GetSheetRange (Sheet) {
        //Function gets Column and Rownumber of upper left cell and lower right cell of SheetRange
        // return false if Sheet or !ref not found, otherwise retrun object with col/row start/end
//console.log("==========  GetSheetRange: ==========");
//console.log(Sheet);
        var objRange = [];
        if (!!Sheet) {
            if (!!Sheet["!ref"]){
                var SheetRef = Sheet["!ref"];
//console.log("SheetRef: " + SheetRef);
                //check if range contains :, if not: range has 1 cell
                var RangeSplit =[];
                if (SheetRef.search(":")=== -1) {
                    RangeSplit = [SheetRef, SheetRef];
                } else {
                    //objRange = {Range: Sheet["!ref"]};
                    //split RangeSplit: Name of StartCell = RangeSplit[0], Name of EndCell = RangeSplit[1];
                    RangeSplit = SheetRef.split(":");
                };
//console.log(">> Range: " + RangeSplit[0] + " - " + RangeSplit[1]);
                var strColName, pos;
                var ColNumber = []; //1-based index of colums
                var RowNumber = []; //1-based index of rows
                //RangeSplit[0] is string of Range Start (upper left cell)
                //RangeSplit[1] is string of Range End  (lower right cell
                for (let x=0; x<2; ++x) {
                    // get position of first digit pos is 0-based
                    pos  =  RangeSplit[x].search(/[0-9]/);
                    // get column letters (0 till pos)
                    strColName  = RangeSplit[x].slice(0,pos);
                    // get row digits (pos till end)
                    RowNumber[x]  = RangeSplit[x].slice(pos);
                    //give ColNumber value =0, otherwise adding values will not work and gives NaN error
                    ColNumber[x] = 0;
                    // iterate through letters of strColName
                    for (let j=0; j<strColName.length ; ++j) {
                        //make letters uppercase (maybe not necessary, but let it stay)
                        let strColNameUpperCase = strColName.toUpperCase();
                        //give letter a number: A=1 - Z=26
                        let CharIndex = -64 + strColNameUpperCase.charCodeAt(j);
                        //calculate power (exponent): Last ltter has exp=0, second last has exp=1, third last has exp=2
                        let exp = strColName.length -j -1;
                        //calculate power (exponent): strColName ABC = 1*26^2 + 2*26^1 + 3*26^0
                        ColNumber[x] += CharIndex *  Math.pow(26, exp);
                    };//for (let j=0; j<strColName.length ; ++j)
                };//for (let x=0; x<2; ++x)
                // extra var necessary otherwise calculation RowCount doesnt work properly PR2017-11-22
                var StartColNumber = Number(ColNumber[0]);
                var EndColNumber = Number(ColNumber[1]);
                var ColCount = EndColNumber - StartColNumber + 1;

                var StartRowNumber = Number(RowNumber[0]);
                var EndRowNumber = Number(RowNumber[1]);
                var RowCount = EndRowNumber - StartRowNumber + 1;

                // range B2:C5 with header gives the following values:
                // StartRowNumber = 3 (header not included)
                // EndRowNumber   = 5
                // RowCount       = 3 (EndRowNumber - StartRowNumber +1)
                objRange ["StartRowNumber"] = StartRowNumber;
                objRange ["EndRowNumber"] = EndRowNumber;
                objRange ["RowCount"] = RowCount;
                objRange ["StartColNumber"] = StartColNumber;
                objRange ["EndColNumber"] = EndColNumber;
                objRange ["ColCount"] = ColCount;
            } else {
//console.log("Sheet[!ref] not found: " + Sheet["!ref"]);
            } //if (!!Sheet["!ref"])
        } else {
//console.log("Sheet not found: " + Sheet);
        };// if (!!Sheet)
//console.log("==========  GetSheetRange return objRange: " + (!!objRange));
//console.log(objRange);
        return objRange;
    }; //function GetSheetRange (Sheet)

//========= GetCellName  ====================================
    function GetCellName (ColNumber, RowNumber ) {
        //PR2017-11-12
        //calculate power (exponent): strColName ABC = 1*26^2 + 2*26^1 + 3*26^0
        //ColNumber[x] += CharIndex *  Math.pow(26, exp);
//console.log("ColNumber: " + ColNumber + " RowNumber: " + RowNumber);
        var col_name = "";
        if (ColNumber>0 && RowNumber>0){

            for (let exp=2; exp>=0; --exp){
                const divisor = Math.pow(26, exp);
                let dividend = ColNumber;
                // subtract 1 (otherwise 26=AA instead of Z, except for last character (exp=0)
                if (exp > 0 ){--dividend;};
//console.log("exp: " + exp + ", dividend: " + dividend +", divisor: " + divisor);
                const mod = Math.floor((dividend)/divisor);
                const frac = ColNumber - mod * divisor;
//console.log("mod: " + mod + ", frac: " + frac);
                if (mod>0){
                    col_name += String.fromCharCode(mod + 64);
                };// if (mod>0){
                ColNumber = frac;
            }; //for (let exp=2; exp>=0; --exp)
            col_name = col_name + RowNumber;
//console.log("col_name " + col_name);
        }; //if (ColNumber>0 && RowNumber>0)
        return col_name;
    }; //function GetCellName (ColIndex, RowIndex )

//========= GetExcelValue  ====================================
    // PR2017-11-04 from: https://stackoverflow.com/questions/2693021/how-to-count-javascript-array-objects
    function GetExcelValue(Sheet, CellName, ValType) {
//console.log("--------------GetExcelValue");
//console.log("GetExcelValue CellName: " + CellName + "ValType: " + ValType);
        var result = "";
        for(let prop in Sheet) {
            if (Sheet.hasOwnProperty(prop)) {
                if (prop === CellName) {
                    let Cell = Sheet[CellName];
                    let propFound = false;
                    for(let prop2 in Cell) {
                        if (Cell.hasOwnProperty(prop2)) {
                            if (prop2 === ValType) {
                                propFound = true;
                                result = Cell[ValType];
                                break;
                            } //if (prop2 === ValType)
                        }; //if (Cell.hasOwnProperty(prop2))

                    } //for(let prop2 in Cell)
                    //// in case of csv file property 'w' not available, get 'v' (value) instead
                    if (!propFound) {
                        result = Cell["v"];
                    };
                    break;
                } //if (prop === CellName)
            } //if (Sheet.hasOwnProperty(prop)
        };//for(let prop in Sheet)
        return result;
    }; //function GetExcelValue

//========= SheetHasRange  ====================================
    function SheetHasRange(Sheet) {
    // PR2017-11-04 from: https://stackoverflow.com/questions/2693021/how-to-count-javascript-array-objects
        //function checks if property "!ref" existst in Sheet. If so, it has a range
        "use strict";
        var result = false;
        for (let prop in Sheet) {
            if (Sheet.hasOwnProperty(prop)) {
                if (prop === "!ref") {
                    result = true;
                    break;
                }
            }
        } //for(let prop in Sheet)
        return result;
    } //function GetExcelValue

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillTsaExcelLinkTables  ====================================
    function FillTsaExcelLinkTables(JustLinkedTsaId, JustUnlinkedTsaId, JustUnlinkedExcId) {
        //console.log("==== FillTsaExcelLinkTables  =========>> ");
        // stored_coldefs: [ {custname: {caption: "Klant - Naam ", excKey: "datestart"}, ...]
        // excel_columns: [ {index: 1, excKey: "Order", tsaKey: "custidentifier", tsaCaption: "Klant - Identificatiecode"}, ...]

// ---  reset tables
        el_tbody_tsa.innerText = null
        el_tbody_exc.innerText = null
        el_tbody_lnk.innerText = null

// ---  first loop through array of stored_coldefs, then through array of excel_columns
        // tblName: 0 = "tsa", 1: "lnk" or "tsa"
        for (let j = 0; j < 2; j++) {
            const items = (!j) ? stored_coldefs : excel_columns
            for (let i = 0, row ; row = items[i]; i++) {
                // row = {tsaKey: "custcode", caption: "Klant - Korte naam", excKey: "Customer"}
                const tblName =  (!j) ? "tsa" : "exc";
                const row_id = get_TEL_row_id(tblName, i);
                // row_id: id_tr_tsa_2

                const is_row_linked = (!j && !!row.excKey)
                const row_cls = (is_row_linked) ? cls_tbl_td_linked : cls_tbl_td_unlinked;
                const cls_width = (is_row_linked) ? "tsa_tw_50perc" : "tsa_tw_100perc";
                const row_tsaKey = get_dict_value(row, ["tsaKey"])
                // dont add row when excel_row is linked (has tsaKey)
                const skip_linked_exc_row = (!!j && !!row_tsaKey);
                if(!skip_linked_exc_row){
// ---  if excKey exists: append row to table ColLinked
                    //  append row to table Tsa if excKey does not exist in items
                    let el_tbody = (is_row_linked) ? el_tbody_lnk : (!j) ? el_tbody_tsa : el_tbody_exc;
// --- insert tblRow into tbody_lnk
                    let tblRow = el_tbody.insertRow(-1);
                        tblRow.id = row_id;
                        const row_key = (!j) ? row.tsaKey : row.excKey;
                        tblRow.setAttribute("data-key", row_key)

                        tblRow.classList.add(row_cls)
                        tblRow.classList.add(cls_width)
                        tblRow.addEventListener("click", function(event) {Handle_TEL_row_clicked(event)}, false);

// --- if new appended row: highlight row for 1 second
                        const cls_just_linked_unlinked = (is_row_linked) ? "tsa_td_linked_selected" : "tsa_td_unlinked_selected";

                        let show_justLinked = false;
                        if(is_row_linked)  {
                            show_justLinked = (!!JustLinkedTsaId && !!row_id && JustLinkedTsaId === row_id)
                        } else  if (!j) {
                            show_justLinked = (!!JustUnlinkedTsaId && !!row_id && JustUnlinkedTsaId === row_id)
                        } else {
                            show_justLinked = (!!JustUnlinkedExcId && !!row_id && JustUnlinkedExcId === row_id)
                        }
                        if (show_justLinked) {
                            let cell = tblRow.cells[0];
                            tblRow.classList.add(cls_just_linked_unlinked)
                            setTimeout(function (){  tblRow.classList.remove(cls_just_linked_unlinked)  }, 1000);
                        }
// --- append td with row.caption
                        let td_first = tblRow.insertCell(-1);
                        td_first.classList.add(row_cls)
                        const text = (!j) ? row.caption : row.excKey;
                        td_first.innerText = text;
// --- if new appended row: highlight row for 1 second
                        if (show_justLinked) {
                            //td_first.classList.add(cls_just_linked_unlinked)
                            //setTimeout(function (){ td_first.classList.remove(cls_just_linked_unlinked)}, 1000);
                            ShowClassWithTimeout(td_first, cls_just_linked_unlinked, 1000) ;
                        }

// --- if linked row: also append td with excKey
                         if (is_row_linked) {
                            let td_second = tblRow.insertCell(-1);
                            td_second.classList.add(row_cls)
                            td_second.innerText = row.excKey;

// --- if new appended row: highlight row for 1 second
                            if (show_justLinked) {
                               //td_second.classList.add(cls_just_linked_unlinked)
                               //setTimeout(function (){  td_second.classList.remove(cls_just_linked_unlinked)  }, 1000);
                               ShowClassWithTimeout(td_second, cls_just_linked_unlinked, 1000) ;
                            }
                         }
// --- add mouseenter/mouseleave EventListener to tblRow
                        const cls_linked_hover = (is_row_linked) ? "tsa_td_linked_hover" : "tsa_td_unlinked_hover";
                            // cannot use pseudo class :hover, because all td's must change color, hover doesn't change children
                        tblRow.addEventListener("mouseenter", function(event) {
                            for (let i = 0, td; td = tblRow.children[i]; i++) {
                                td.classList.add(cls_linked_hover)
                        }});
                        tblRow.addEventListener("mouseleave", function() {
                            for (let i = 0, td; td = tblRow.children[i]; i++) {
                                td.classList.remove(cls_linked_hover)
                        }});
                } //  if(!skip_linked_exc_row)
            };  // for (let i = 0, row ; row = items[i]; i++)
        }  // for (let j = 0; j < 2; j++)
     }; // FillTsaExcelLinkTables()

//=========   Handle_TEL_row_clicked   ======================
    function Handle_TEL_row_clicked(event) {  //// EAL: Excel Tsa Linked table
        // function gets row_clicked.id, row_other_id, row_clicked_key, row_other_key
        // sets class 'highlighted' and 'hover'
        // and calls 'LinkColumns' or 'UnlinkColumns'
        // currentTarget refers to the element to which the event handler has been attached
        // event.target which identifies the element on which the event occurred.
        console.log("=========   Handle_TEL_row_clicked   ======================") ;
        //.log("event.currentTarget", event.currentTarget) ;

        if(!!event.currentTarget) {
            let tr_selected = event.currentTarget;
            let table_body_clicked = tr_selected.parentNode;
            const tbodyName = get_attr_from_el(table_body_clicked, "data-tbody");
            const cls_selected = (tbodyName === "lnk") ? cls_linked_selected : cls_unlinked_selected;

            const row_clicked_id = tr_selected.id;
            const row_clicked_key = get_attr_from_el(tr_selected, "data-key");
            let row_other_id = null, row_other_key = null;

// ---  check if clicked row is already selected
            const tr_is_not_yet_selected = (!get_attr_from_el(tr_selected, "data-selected", false))

// ---  if tr_is_not_yet_selected: add data-selected and class selected, remove class selected from all other rows in this table
            const cls_linked_unlinked_hover = (tbodyName === "lnk") ? "tsa_td_linked_hover" : "tsa_td_unlinked_hover";
            for (let i = 0, row; row = table_body_clicked.rows[i]; i++) {
                if(tr_is_not_yet_selected && row === tr_selected){
                    row.setAttribute("data-selected", true);
                    for (let i = 0, td; td = row.children[i]; i++) {
                        td.classList.add(cls_selected)
                        td.classList.remove(cls_linked_unlinked_hover)};
                } else {
// ---  remove data-selected and class selected from all other rows in this table, also this row if already selected
                    row.removeAttribute("data-selected");
                    for (let i = 0, td; td = row.children[i]; i++) {
                        td.classList.remove(cls_selected);
                        td.classList.remove(cls_linked_unlinked_hover)};
                }
            }
// ---  only if clicked on tsa or exc row:
            if (["tsa", "exc"].indexOf(tbodyName) > -1) {
// ---  if clicked row was not yet selected: check if other table has also selected row, if so: link
                if(tr_is_not_yet_selected) {
// ---  check if other table has also selected row, if so: link
                    let table_body_other = (tbodyName === "exc") ? el_tbody_tsa : el_tbody_exc;
// ---  loop through rows of other table
                    let link_rows = false;
                    for (let j = 0, row_other; row_other = table_body_other.rows[j]; j++) {
                       const other_tr_is_selected = get_attr_from_el(row_other, "data-selected", false)
// ---  set link_rows = true if selected row is found in other table
                       if(other_tr_is_selected) {
                           link_rows = true;
                           row_other_id = get_attr_from_el(row_other, "id");
                           row_other_key = get_attr_from_el(row_other, "data-key");
                           break;
                        }
                    }
// ---  link row_clicked with delay of 250ms (to show selected Tsa and Excel row)
                    if (link_rows){
                        setTimeout(function () {
                            LinkColumns(tbodyName, row_clicked_id, row_other_id, row_clicked_key, row_other_key);
                        }, 250);
                    }
                }
            } else if (tr_is_not_yet_selected) {
// ---  unlink tr_selected  with delay of 250ms (to show selected Tsa and Excel row)
                setTimeout(function () {
                    UnlinkColumns(tbodyName, row_clicked_id, row_clicked_key);
                    }, 250);
            }
       }  // if(!!event.currentTarget) {
    };  // Handle_TEL_row_clicked

//========= LinkColumns  ====================================================
    function LinkColumns(tbodyName, row_clicked_id, row_other_id, row_clicked_key, row_other_key) {
        console.log("==========  LinkColumns ========== ");
        // function adds 'excCol' to stored_coldefs and 'tsaCaption' to excel_columns

        // stored_coldefs: {tsaKey: "custname", caption: "Klant - Naam ", excKey: "datestart"
        // excel_columns: {index: 1, excKey: "Order", tsaKey: "custidentifier", tsaCaption: "Klant - Identificatiecode"

        const stored_row_id = (tbodyName === "tsa") ? row_clicked_id : (tbodyName === "exc") ? row_other_id : null;
        const stored_row_tsaKey = (tbodyName === "tsa") ? row_clicked_key : (tbodyName === "exc") ? row_other_key : null;
        const excel_row_excKey = (tbodyName === "tsa") ? row_other_key : (tbodyName === "exc") ? row_clicked_key : null;

        let stored_row = get_arrayRow_by_keyValue (stored_coldefs, "tsaKey", stored_row_tsaKey);
        // stored_row = {tsaKey: "ordername", caption: "Opdracht"}
        let excel_row = get_arrayRow_by_keyValue (excel_columns, "excKey", excel_row_excKey);
        // excel_row = {caption: "Opdracht", excKey: "sector_sequence", tsaKey: "ordername"}

        if(!!stored_row && !!excel_row){
            if(!!excel_row.excKey){
                stored_row["excKey"] = excel_row.excKey;};
            if(!!stored_row.tsaKey){
                excel_row["tsaKey"] = stored_row.tsaKey;};
            if(!!stored_row.caption){
                excel_row["tsaCaption"] = stored_row.caption;};
        }

        UploadSettingsImport("link");
        FillTsaExcelLinkTables(stored_row_id);
        UpdateDatatableHeader();
        HighlightAndDisableSelectedButton("LinkColumns");
    };  // LinkColumns

//========= UnlinkColumns =======================================================
    function UnlinkColumns(tbodyName, row_clicked_id, row_clicked_key) {
        // function deletes attribute 'excKey' from stored_coldefs
        // and deletes attributes 'tsaKey' and 'tsaCaption' from ExcelDef
        // if type= 'col': UpdateDatatableHeader
        // calls UploadSettingsImport and
        //console.log("====== UnlinkColumns =======================");

// function removes 'excKey' from stored_coldefs and 'tsaKey' from excel_columns

        const JustUnlinkedTsaId = row_clicked_id;

        // in unlink: row_clicked_key = tsaKey
        // stored_row = {tsaKey: "gender", caption: "Geslacht", excKey: "MV"}
        let excel_row, JustUnlinkedExcId = null;
        let stored_row = get_arrayRow_by_keyValue (stored_coldefs, "tsaKey", row_clicked_key);

        // excel_row =  {index: 8, excKey: "geboorte_land", tsaKey: "birthcountry", tsaCaption: "Geboorteland"}
        if (!!stored_row && !!stored_row.excKey) {
// ---  look up excKey in excel_columns
            excel_row = get_arrayRow_by_keyValue (excel_columns, "excKey", stored_row.excKey)

// ---  delete excKey from stored_row
            delete stored_row.excKey;
            if (!!excel_row) {
                JustUnlinkedExcId = get_TEL_row_id("exc", excel_row.index);
// ---  delete tsaKey and tsaCaption from excel_row]
                delete excel_row.tsaKey;
                delete excel_row.tsaCaption;
            }
        }  // if (!!stored_row)

// ---  upload new settings
        UploadSettingsImport("link");
        FillTsaExcelLinkTables(null, JustUnlinkedTsaId, JustUnlinkedExcId);
        UpdateDatatableHeader();
        HighlightAndDisableSelectedButton("UnlinkColumns");
    }  // UnlinkColumns

//========= function UdateDatatableHeader  ====================================================
    function UpdateDatatableHeader() {
        //console.log("---------  function UpdateDatatableHeader ---------");
        //----- set tsaCaption in linked header colomn of datatable
//----- loop through array excel_columns from row index = 0
        for (let j = 0 ; j <excel_columns.length; j++) {
            // only rows that are not linked are added to tblColExcel
            let ExcCol = excel_columns[j].excKey;
            let TsaCaption = excel_columns[j].tsaCaption;

            let theadCol = document.getElementById("idTblCol_" + ExcCol);
            theadCol.innerHTML =  (!!TsaCaption) ? TsaCaption: ExcCol;

            add_or_remove_class(theadCol, cls_linked_selected, !!TsaCaption);
            add_or_remove_class(theadCol, cls_unlinked_selected, !TsaCaption);
        }
   } // function UpdateDatatableHeader

//========= UPLOAD SETTING COLUMNS =====================================
    function UploadSettingsImport (calledby) {
        //console.log ("==========  UploadSettingsImport");
        //console.log ("calledby: ", calledby);

        let upload_dict = {importtable: "employee"};
        if (calledby === "HandleSelectCodeCalc"){
// ---  upload code_calc
            if(el_select_code_calc.value){
                upload_dict["codecalc"] = el_select_code_calc.value;
            }
        } else if (calledby !== "link"){
// ---  upload worksheetname and has_header when not called by 'link'
            if (!!selected_worksheetname){
                upload_dict["worksheetname"] = selected_worksheetname;
            }
            upload_dict["has_header"] = stored_has_header;

        } else {
            let linked_coldefs = {};
            if (!!stored_coldefs){
                for (let i = 0, coldef; coldef = stored_coldefs[i]; i++) {
                    let tsaKey = coldef.tsaKey
                    if(!!tsaKey){
                        let excKey = coldef.excKey
                        if (!!excKey){
                            linked_coldefs[tsaKey] = excKey;
                        }
                    }
                }
            };
            // also upload when linked_coldefs is empty, to delete existing links from database
            upload_dict["coldefs"] = linked_coldefs;
        }  // if (calledby !== "link"){
        if (!isEmpty(upload_dict)){
            const parameters = {"upload": JSON.stringify (upload_dict)};
            const url_str = get_attr_from_el(el_data, "data-employee_uploadsetting_url");
            response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log("UploadSettingsImport response: ", response);
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                }
            });  // $.ajax
        };
    }; // function (UploadSettingsImport)

//========= has_tsaKeys DATA =====================================
    function has_tsaKeys(){
//  ---  loop through excel_columns to get linked tsaKeys
        let has_tsaKeys = false
        if(!!excel_columns){
            for (let i = 0, col; col = excel_columns[i]; i++) {
                const tsaKey = get_dict_value(col, ["tsaKey"])
                if (!!tsaKey){
                    has_tsaKeys = true
                    break;
        }}}
        return has_tsaKeys;
    }

//========= UPLOAD DATA =====================================
    function UploadData(is_test_upload){
        console.log ("==========  UPLOAD DATA ==========");
        const url_str = get_attr_from_el(el_data, "data-employee_uploaddata_url")

        let rowLength = 0, colLength = 0;
        if(!!worksheet_data){rowLength = worksheet_data.length;};
        if(!!stored_coldefs){colLength = stored_coldefs.length;};
        if(rowLength > 0 && colLength > 0){

//  ---  loop through excel_columns to get linked tsaKeys
            let tsaKey_list = []
            for (let i = 0, len = excel_columns.length ; i < len; i++) {
                let col = excel_columns[i];
                const tsaKey = get_dict_value_by_key(col, "tsaKey")
                if (!!tsaKey){tsaKey_list.push(tsaKey)}
            }
            if(!tsaKey_list || !tsaKey_list.length){
                alert("No linked columns")
            } else {

//  ---  get codecalc
            const code_calc = (el_select_code_calc.value) ? el_select_code_calc.value : "linked";

//  ---  get dateformat
            const date_format = (excel_dateformat) ? excel_dateformat : el_select_dateformat.value;

// ---  loop through all rows of worksheet_data
                let employees = [];
                for (let i = 0; i < rowLength; i++) {
                    let DataRow = worksheet_data[i];

//------ loop through excel_columns
                    // rowindex is index of tablerow. Index 0 is header, therefore rowindex starts with 1
                    let item = {rowindex: i};
                    for (let idx = 0, len = excel_columns.length ; idx < len; idx++) {
                        if (!!excel_columns[idx].tsaKey){
                            let tsa_key = excel_columns[idx].tsaKey;
                            if (!!DataRow[idx]){
                                item[tsa_key] = DataRow[idx];
                            }
                        }
                    }; //for (let col = 1 ; col <colLength; col++)
                    employees.push(item);
                }
                if(!employees || !employees.length){
                    alert("No employees found")
                } else {
// --- show loader
                    el_loader.classList.remove(cls_visible_hide)

                    const request = {importtable: "employee",
                                     tsaKey_list: tsaKey_list,
                                     codecalc: code_calc,
                                     test: is_test_upload,
                                     dateformat: date_format,
                                     employees: employees,
                                     //paydateitems: paydateitems
                                     }
                    const parameters = {"upload": JSON.stringify (request)};
                    console.log("request", request);

                    $.ajax({
                        type: "POST",
                        url: url_str,
                        data: parameters,
                        dataType:'json',
                        success: function (response) {
                            console.log("========== response Upload employees");
                            console.log(response);

        //--------- hide loading gif
                            el_loader.classList.add(cls_visible_hide)

                            FillDataTableAfterUpload(response, worksheet_range);


        //--------- print log file
                            log_list = get_dict_value_by_key(response, "logfile")
                            if (!!log_list && log_list.length > 0) {
                                printPDFlogfile(log_list, "log_import_employees")
                            }
                        },
                        error: function (xhr, msg) {
        //--------- hide loading gif
                            el_loader.classList.add(cls_visible_hide)

                            console.log(msg + '\n' + xhr.responseText);
                        }
                    });
                }  // if(!orders || !orders.length){
            }  // if(!tsaKey_list || !tsaKey_list.length){
        }; //if(rowLength > 0 && colLength > 0)
    }; //  UploadData
//========= END UPLOAD =====================================

//=========  HandleBtnSelect  ======= PR2020-04-15
    function HandleBtnSelect(data_btn) {
        console.log("=== HandleBtnSelect ===", data_btn);
        selected_btn = data_btn;
        //HighlightSelectedButton();
        HandleBtnPrevNext();
    }

//=========  HandleBtnPrevNext  ================ PR2019-05-25
    function HandleBtnPrevNext(prev_next) {
        console.log( " ===== HandleBtnPrevNext ========= ");
       //console.log( "prev_next: ", prev_next);

        if (prev_next === "next"){
            selected_btn = (selected_btn === "btn_step1") ? "btn_step2" :
                           (selected_btn === "btn_step2") ?  "btn_step3" : "btn_step4";
        } else if (prev_next === "prev"){
            selected_btn = (selected_btn === "btn_step4") ? "btn_step3" :
                           (selected_btn === "btn_step3") ?  "btn_step2" : "btn_step1";
        } else {
            // keep current selected_btn when prev_next has no value
        }

// ---  set header text
        let el_header = document.getElementById("id_header")
        let header_text = (selected_btn === "btn_step1") ? loc.Step + " 1: " + loc.Select_file :
                          (selected_btn === "btn_step2") ? loc.Step + " 2: " + loc.Link_colums :
                          (selected_btn === "btn_step3") ? loc.Step + " 3: " + loc.Calculate_code :
                          (selected_btn === "btn_step4") ? loc.Step + " 4: " + loc.Upload_data :
        el_header.innertext = header_text


// ---  show only the elements that are used in this mod_shift_option
        let list = document.getElementsByClassName("btn_show");
        for (let i=0, el; el = list[i]; i++) {
            const is_show = el.classList.contains(selected_btn)
            show_hide_element(el, is_show)
        }

// ---  calculate dateformat when clcked on btn_step3
        if(selected_btn === "btn_step3" || (selected_btn === "btn_step4")){

// ---  detect dateformat of fields: 'datefirst', 'datelast'
            // function is already called by FillWorksheetData
            // has_linked_datefields and excel_dateformat are global variables, are set in get_excel_dateformat
            get_excel_dateformat(["datefirst", "datelast"]);

            // only show select format when has_linked_datefields and  excel_dateformat = null
            const show_select_dateformat = (has_linked_datefields && !excel_dateformat)
            const el_div_dateformat = document.getElementById("id_div_dateformat");
            add_or_remove_class(el_div_dateformat, cls_hide, !show_select_dateformat)

            if(show_select_dateformat ){
                // only show error msg when when no format is selected
                const show_msg_err = (show_select_dateformat && !el_select_dateformat.value)
                const el_msg_dateformat = document.getElementById("id_msg_dateformat");
                add_or_remove_class(el_msg_dateformat, cls_hide, !show_msg_err )
                if(show_msg_err){
                    setTimeout(function() {el_select_dateformat.focus()}, 50);
                }
            }
        }

// ---  highlight selected button
        HighlightAndDisableSelectedButton("HandleBtnPrevNext");
    }  // HandleBtnPrevNext

//=========  HandleSelectdateformat  ================ PR2019-06-04
    function HandleSelectdateformat(el) {
        console.log( " ===== HandleSelectdateformat ========= ");

        const el_msg_dateformat = document.getElementById("id_msg_dateformat");
        add_or_remove_class(el_msg_dateformat, cls_visible_hide, el_select_dateformat.value)

        HighlightAndDisableSelectedButton("HandleSelectdateformat");
    }  // HandleSelectdateformat

//=========  HighlightAndDisableSelectedButton  ================ PR2019-05-25
    function HighlightAndDisableSelectedButton(called_by) {
        console.log("=== HighlightAndDisableSelectedButton ===", called_by);
        // el_btn_mod_prev andel_btn_mod_next don't exists when user has no permission
        if(!!el_btn_mod_prev && el_btn_mod_next) {
            const no_worksheet = (!worksheet_range);
            const no_worksheet_with_data = (!(!!el_worksheet_list && el_worksheet_list.options.length));
            const no_linked_columns = (!excel_columns.length)
            const no_excel_data = (!worksheet_data.length);
            const no_dateformat = ((no_excel_data) || (has_linked_datefields && !excel_dateformat && !el_select_dateformat.value))

            let no_identifier_linked = true, key_payrollcode = false, key_identifier = false, key_code = false
            if(!!stored_coldefs) {
                for (let i = 0, stored_row; stored_row = stored_coldefs[i]; i++) {
                    // stored_row = {tsaKey: "orderdatelast", caption: "Einddatum opdracht"}
                    const key = stored_row.tsaKey
                    if (["payrollcode", "identifier"].indexOf(key) > -1){
                        if (!!stored_row.excKey){
                            if (key === "payrollcode") {key_payrollcode = true } else
                            if (key === "identifier") {key_identifier = true } ;
                            no_identifier_linked = false;
                        }
                    }
                }
            }

            const step2_disabled = (no_worksheet || no_worksheet_with_data);
            const step3_disabled = (step2_disabled || no_linked_columns || no_identifier_linked || no_excel_data);
            const step4_disabled = (step3_disabled || el_select_code_calc.selectedIndex < 0 || no_dateformat);

            const btn_prev_disabled = (selected_btn === "btn_step1")
            const btn_next_disabled = ( (selected_btn === "btn_step4") ||
                                        (selected_btn === "btn_step3" && step4_disabled) ||
                                        (selected_btn === "btn_step2" && step3_disabled) ||
                                        (selected_btn === "btn_step1" && step2_disabled)
                                        )

            el_btn_mod_prev.disabled = btn_prev_disabled;
            el_btn_mod_next.disabled = btn_next_disabled;

// ---  disable selected button
            let el_btn_container = document.getElementById("id_btn_container")
            if(!!el_btn_container){
                let btns = el_btn_container.children;
                for (let i = 0, btn; btn = btns[i]; i++) {
                    const data_btn = get_attr_from_el(btn, "data-btn")
                    if (data_btn === "btn_step1"){
                        // button step 1 is alway enabled
                        btn.disabled = false;
                    } else if (data_btn === "btn_step2"){
                        btn.disabled = step2_disabled;
                    } else if (data_btn === "btn_step3"){
                        btn.disabled = step3_disabled;
                    } else if (data_btn === "btn_step4"){
                        btn.disabled = step4_disabled;
                    }
// ---  highlight selected button
                    const is_add = (data_btn === selected_btn);
                    add_or_remove_class (btn, cls_btn_selected, is_add);
            }};

// ---  show headertext
            let el_header_container = document.getElementById("id_header_container")
            if(!!el_header_container){
                let els = el_header_container.children;
                for (let i = 0, el; el=els[i]; i++) {
                    const data_btn = get_attr_from_el(el, "data-btn")
                    const is_show = (data_btn === selected_btn);
                    show_hide_element(el, is_show)
                }
            }

// ---  make err_msg visible
            let el_msg_err01 = document.getElementById("id_msg_err01");
            add_or_remove_class (el_msg_err01, cls_hide, !!selected_file);
            let el_msg_err_no_identifier_linked = document.getElementById("id_msg_err_no_identifier_linked");
            add_or_remove_class (el_msg_err_no_identifier_linked, cls_hide, !no_identifier_linked);

// ---  focus on next element
            if (selected_btn === "btn_step1"){
                if (!selected_file) {
                    el_filedialog.focus()
                } else if (!selected_worksheetname) {
                    el_worksheet_list.focus()
                } else {
                    el_btn_mod_next.focus()
                }
            } else if(selected_btn === "btn_step3"){
                el_btn_upload.focus()
            }
        }
    }  // HighlightAndDisableSelectedButton

//========= UpdateSettingsImport  ================ PR2020-04-17
    function UpdateSettingsImport(companysetting_dict){
        //console.log("===== UpdateSettingsImport ===== ")
        //console.log("companysetting_dict", companysetting_dict)
        if (!isEmpty(companysetting_dict)){
            const coldefs_dict = get_dict_value(companysetting_dict, ["coldefs"])
            if (!isEmpty(coldefs_dict)){
                stored_worksheetname = get_dict_value(coldefs_dict, ["worksheetname"])
                stored_has_header = get_dict_value(coldefs_dict, ["has_header"])
                stored_code_calc = get_dict_value(coldefs_dict, ["codecalc"], "linked")
                stored_coldefs = get_dict_value(coldefs_dict, ["coldefs"])
            };
        };
        //("stored_coldefs", stored_coldefs)
    }  // UpdateSettingsImport

    //=====import CSV file ===== PR2020-04-16
    // TODO add csv filetype
    // from https://www.quora.com/What-is-the-best-way-to-read-a-CSV-file-using-JavaScript-not-JQuery
    function Upload() {
        var fileUpload = document.getElementById("fileUpload");
        var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;
        // shouldnt it be const regex = RegExp('foo*');
        // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test
        if (regex.test(fileUpload.value.toLowerCase())) {
            if (typeof (FileReader) != "undefined") {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var table = document.createElement("table");
                    var rows = e.target.result.split("\n");
                    for (var i = 0; i < rows.length; i++) {
                        var row = table.insertRow(-1);
                        var cells = rows[i].split(",");
                        for (var j = 0; j < cells.length; j++) {
                            var cell = row.insertCell(-1);
                            cell.innerHTML = cells[j];
                        }
                    }
                    var dvCSV = document.getElementById("dvCSV");
                    dvCSV.innerHTML = "";
                    dvCSV.appendChild(table);
                }
                reader.readAsText(fileUpload.files[0]);
            } else {
                alert("This browser does not support HTML5.");
            }
        } else {
            alert("Please upload a valid CSV file.");
        }
    }

//=========  FillDataTableAfterUpload  ============================== PR2020-06-03
    function FillDataTableAfterUpload(response, sheet_range) {
        console.log("=========  FillDataTableAfterUpload =========");
        const employee_list = response.employee_list

        if(worksheet_data && excel_columns && employee_list){
            // create a <tblHead> element
            let tblHead = document.getElementById('id_thead');
            let tblBody = document.getElementById('id_tbody');

            //PR2017-11-21 debug: error when StartColNumber > 1, j must start at 0
            let EndIndexPlusOne = (sheet_range.EndColNumber) - (sheet_range.StartColNumber -1)

            //var EndRowIndex = 9;
            let LastRowIndex = sheet_range.RowCount -1;
            // worksheet_data has no header row, start allways at 0
            if (stored_has_header) { --LastRowIndex;}
            //if (EndRow-1 < EndRowIndex) { EndRowIndex = EndRow-1;};

// ++++++++ iterate through employee_list rows
            for (let i = 0, len = employee_list.length; i <= len; i++) {
                let employee_dict = employee_list[i];
// --- lookup tblRow in tblBody by row_index
                const row_index = get_dict_value(employee_dict, ["id", "rowindex"], -1)
                if (row_index > -1){
                    let tblRow = tblBody.rows[row_index]; //index -1 results in that the new row will be inserted at the last position.
// if pk_int is not present, the record is not saved
                    const pk_int = get_dict_value(employee_dict, ["id", "pk"]);
                    const is_created = get_dict_value(employee_dict, ["id", "created"], false);
                    const record_is_saved = (!!pk_int);
                    // msg_row_err is general error
                    const msg_row_err = get_dict_value(employee_dict, ["row_error"]);
                    if (msg_row_err){ tblRow.title = msg_row_err};
//+++ lookup cells in tblRow
                    for (let j = 0, len = excel_columns.length ; j < len; j++) {
    //========= Create td
                        let tblCell = tblRow.cells[j];
                        let key = get_dict_value(excel_columns[j], ["tsaKey"]);
                        let msg_err = null, cell_is_updated = false;
    // ---  make font color grey if column not linked
                        if (key) {
                            const field_dict = get_dict_value(employee_dict, [key])
                            if (!isEmpty(field_dict)){
                                cell_is_updated = get_dict_value(field_dict, ["updated"], false);
                                const value = get_dict_value(field_dict, ["value"]);
                                msg_err = get_dict_value(field_dict, ["error"])
                                const msg_info = get_dict_value(field_dict, ["info"])
                                if(msg_err) {
                                    tblCell.innerText = msg_err;
                                } else if(cell_is_updated){
                                    tblCell.innerText = value;
                                }
                                if (msg_info) {tblCell.title = msg_info}
                            }
                        }
                        let cell_background =  cls_cell_unchanged_even;
                        let class_font_color = "tsa_color_mediumgrey";
                        if (key) {
                            if (!msg_row_err || msg_err){class_font_color = "tsa_color_black"};
                            if (msg_row_err){
                                cell_background = cls_cell_error_odd
                            } else if(msg_err) {
                                cell_background = cls_cell_error_odd
                            } else if (is_created){
                                cell_background = cls_cell_saved_odd
                            } else if(cell_is_updated){
                                cell_background = cls_cell_saved_even
                            }
                        }
                        tblCell.classList.add(cell_background)
                        tblCell.classList.add(class_font_color);
                    } //for (let j = 0; j < 2; j++)
                }  // if (row_index > 0)
            } //for (let i = 0; i < 2; i++)
        }; // if(!!worksheet_data && !!excel_columns){
    };//function FillDataTableAfterUpload() {

    function get_TEL_row_id(tblName, i){
        // function created row_id for table TSA-columns, Exc-columns and Lnk-columns PR2020-04-18
        return "id_tr_" + tblName  + "_" + i.toString();
    }

//=========  get_excel_dateformat  ================ PR2020-06-04
    function get_excel_dateformat(datefield_list){
        //console.log(" -----  get_excel_dateformat   ----")

// ---  detect dateformat of fields: 'datefirst', 'datelast'
        // has_linked_datefields and excel_dateformat are global variables
        has_linked_datefields = false;
        excel_dateformat = null;

        let field_index_list = [];
        for (let i = 0, coldef; coldef = excel_columns[i]; i++) {
            const fldName = get_dict_value(coldef, ["tsaKey"])
            if(datefield_list.indexOf(fldName) > -1){
                const excKey = get_dict_value(coldef, ["excKey"]);
                if(excKey){
                    has_linked_datefields = true;
                    field_index_list.push(i)
        }}};
        if (has_linked_datefields){
            excel_dateformat = detect_dateformat(worksheet_data, field_index_list)
        }
    }

// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++

//=========  ModConfirmOpen  ================ PR2020-06-05
    function ModConfirmOpen() {
        //console.log(" -----  ModConfirmOpen   ----")
// ---  set text
        document.getElementById("id_confirm_header").innerText = loc.Upload_employees;
        document.getElementById("id_confirm_msg01").innerText = loc.The_employee_data_will_be_saved;
        document.getElementById("id_confirm_msg02").innerText = loc.Do_you_want_to_continue;
        document.getElementById("id_confirm_msg03").classList.add(cls_hide);
// ---  set focus on save button
        setTimeout(function() { el_confirm_btn_save.focus()}, 50);
// ---  show modal
        $("#id_mod_confirm").modal({backdrop: true});
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2020-06-05
    function ModConfirmSave() {
        console.log(" -----  ModConfirmSave   ----")
        $("#id_mod_confirm").modal("hide");
        UploadData(false);  // false = no test
    }


    }); //$(document).ready(function() {
