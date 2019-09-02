//var file_types = {
//    xls:"application/vnd.ms-excel",
//    xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};

$(function() {
console.log("employee_import.js")
// ---  set selected menu button active
    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_selected = "c_table_stud_thead_td_selected";

    const cls_colExcelTsa_tr = "c_colExcelTsa_tr";
    const cls_columns_header = "c_columns_header";
    const cls_colLinked_tr = "c_colLinked_tr";
    const cls_grid_colExcel = "c_grid_colExcel";
    const cls_grid_colLinked = "c_grid_colLinked";
    const cls_cell_saved_even = "cell_saved_even";
    const cls_cell_saved_odd = "cell_saved_odd";
    const cls_cell_unchanged_even = "cell_unchanged_even";
    const cls_cell_unchanged_odd = "cell_unchanged_odd";
    const cls_ea_flex = "ea_flex";
    const cls_li_flex= "li_flex";
    const cls_display_show = "display_show";
    const cls_display_hide = "display_hide";

    let btn_clicked = document.getElementById("id_sub_empl_imp");
    SetMenubuttonActive(btn_clicked);

// set global variables
    let div_info = document.getElementById('div_infoID');
    let para = document.createElement('p');

    let file_dialog = document.getElementById("filedialogID");
    file_dialog.addEventListener("change", handle_file_dialog, false);

    let el_worksheet_list = document.getElementById("id_worksheet_list");
    el_worksheet_list.addEventListener("change", handle_worksheet_list, false);

    let checkbox_noheader = document.getElementById("checkBoxID");
    checkbox_noheader.addEventListener("change", handle_checkbox_noheader_changed) //, false);

    let el_select_code_calc = document.getElementById("id_select_code_calc");
    el_select_code_calc.addEventListener("change", handle_select_code_calc, false);

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const captions = get_attr_from_el_dict(el_data, "data-captions");
    const settings_dict = get_attr_from_el_dict(el_data, "data-settings");

    // get the stored_columns from data-tag in el_data
    let stored_coldefs = {};
    let stored_no_header = false;
    let stored_worksheetname = "";
    let stored_code_calc = "linked";
    if (!!settings_dict){
        stored_worksheetname = get_dict_value_by_key(settings_dict, "worksheetname")
        stored_coldefs = get_dict_value_by_key(settings_dict, "coldefs")
        stored_no_header = get_dict_value_by_key(settings_dict, "no_header")

        stored_code_calc = get_dict_value_by_key(settings_dict, "codecalc")
        if (!!stored_code_calc){el_select_code_calc.value = stored_code_calc}
    };

    let selected_file = null;
    let workbook;
    let worksheet;
    let worksheet_range;
    let worksheet_data = [];
    let excel_columns = [];

    let selected_worksheetname = stored_worksheetname;

    const file_types = {
        xls:"application/vnd.ms-excel",
        xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

//=========   handle_file_dialog   ======================
    function handle_file_dialog() { // functie wordt alleen doorlopen als file is geselecteerd
//console.log(" ========== handle_file_dialog ===========");
        let curFiles = file_dialog.files; //This one doesn't work in Firefox: var curFiles = event.target.files;

        selected_file = null;
        excel_columns = [];
        worksheet_data = [];

        if(curFiles.length === 0) {
            para.textContent = captions.no_file_selected // 'No file is currently selected';
        } else {
            if(!is_valid_filetype(curFiles[0])) {
                para.textContent = 'File name ' + curFiles[0].name + ': Not a valid file type. Update your selection.';
            } else {
                selected_file = curFiles[0];
                para.textContent = 'File name: '+ selected_file.name ;
            }
        }

        div_info.appendChild(para);

        Get_Workbook(selected_file);
    }

//=========  handle_worksheet_list   ======================
    function handle_worksheet_list() {
console.log(" ========== handle_worksheet_list ===========");
        if(!!workbook){
            if(!!el_worksheet_list.value){
                selected_worksheetname = el_worksheet_list.value;

//---------  get selected worksheet
                worksheet = workbook.Sheets[selected_worksheetname];
                if(!!worksheet){
//--------- get Column and Rownumber of upper left cell and lower right cell of SheetRange
                    worksheet_range = GetSheetRange (worksheet);
                    if (!!worksheet_range) {

//--------- set checkbox_noheader checked
                        checkbox_noheader.checked = stored_no_header;
//--------- fill worksheet_data with data from worksheet
                        worksheet_data = FillWorksheetData(worksheet, worksheet_range, stored_no_header);
//--------- fill table excel_columns
                        Fill_Excel_Items();
                        CreateMapTableWrap("col");
//--------- fill DataTable
                        FillDataTable(worksheet_range);
                        UpdateDatatableHeader();
                        // upload new settings tsaCaption
                        UploadSettings ();
            }}}
        }  // if(!!workbook)
    }  // function handle_worksheet_list()

//=========   handle_checkbox_noheader_changed   ======================
    function handle_checkbox_noheader_changed() {
console.log(" ========== handle_checkbox_noheader_changed ===========");
        if(!!worksheet && !!worksheet_range) {
            stored_no_header = checkbox_noheader.checked;
//--------- fill worksheet_data with data from worksheet
            worksheet_data = FillWorksheetData(worksheet, worksheet_range, stored_no_header);
//--------- fill table excel_columns
            Fill_Excel_Items();
            CreateMapTableWrap("col");
//--------- fill DataTable
            FillDataTable(worksheet_range);
            UpdateDatatableHeader();
            // upload new settings tsaCaption
            UploadSettings ();
        }  // if(!!worksheet){
    }; //handle_checkbox_noheader_changed

//=========   handle_select_code_calc   ======================
    function handle_select_code_calc() {
        // console.log("=========   handle_select_code_calc   ======================") ;
        UploadSettings ();
    }  // handle_select_code_calc

//=========   handle_EAL_row_clicked   ======================
    function handle_EAL_row_clicked(e) {  //// EAL: Excel Tsa Linked table
        // function gets row_clicked.id, row_other_id, row_clicked_key, row_other_key
        // sets class 'highlighted' and 'hover'
        // and calls 'linkColumns' or 'unlinkColumns'
        // currentTarget refers to the element to which the event handler has been attached
        // event.target which identifies the element on which the event occurred.
console.log("=========   handle_EAL_row_clicked   ======================") ;
console.log("e.target.currentTarget.id", e.currentTarget.id) ;

        if(!!e.target && e.target.parentNode.nodeName === "TR") {
            let cur_table = e.currentTarget; // id_col_table_tsa
            // extract 'col' from 'id_col_table_tsa'
            const tableName = cur_table.id.substring(3,6); //'col',
            // extract 'tsa' from 'id_col_table_tsa'
            const tableBase = cur_table.id.substring(13); //'exc', 'tsa', 'lnk'
//console.log("tableBase ", tableBase, "tableName: ", tableName) ;

            let row_clicked =  e.target.parentNode;
            let row_clicked_key = "";
            if(row_clicked.hasAttribute("key")){
                row_clicked_key = row_clicked.getAttribute("key");
            }
//console.log("row_clicked.id: <",row_clicked.id, "> row_clicked_key: <",row_clicked_key, ">");

            let table_body_clicked = document.getElementById(row_clicked.parentNode.id);

            let link_rows = false;
            let row_other_id = "";
            let row_other_key = "";

            if((tableName === "exc")|| (tableName === "tsa") ) {
                    if(row_clicked.classList.contains(cls_selected)) {
                    row_clicked.classList.remove(cls_selected, cls_hover);
                } else {
                    row_clicked.classList.add(cls_selected);
                    // remove clas from all other rows in theis table
                    if(!!table_body_clicked.rows){
                        for (let i = 0, row; row = table_body_clicked.rows[i]; i++) {
                            if(row === row_clicked){
                                row.classList.add(cls_selected);
                            } else {
                                row.classList.remove(cls_selected, cls_hover);
                            }
                        }
                    }
                // check if other table has also selected row, if so: link
                    let tableName_other;
                    if(tableName === "exc") {tableName_other = "tsa"} else {tableName_other = "exc"}
                    let row_other_tbody_id = "id_" + tableName_other + "_tbody_" + tableBase;
//console.log("row_other_tbody_id",row_other_tbody_id)
                    let table_body_other = document.getElementById(row_other_tbody_id);
//console.log("table_body_other",table_body_other)
                    for (let j = 0, row_other; row_other = table_body_other.rows[j]; j++) {
                       if(row_other.classList.contains(cls_selected)) {
                           link_rows = true;
                           if(row_other.hasAttribute("id")){row_other_id = row_other.getAttribute("id");}
                           if(row_other.hasAttribute("key")){row_other_key = row_other.getAttribute("key");}
                           break;
                        }
                    }
                    // link row_clicked with delay of 250ms (to show selected Tsa and Excel row)
                    if (link_rows){
//console.log("row_other_id: <",row_other_id, "> row_other_key: <",row_other_key, ">");
                        setTimeout(function () {
                            linkColumns(tableBase, tableName, row_clicked.id, row_other_id, row_clicked_key, row_other_key);
                        }, 250);
                    }
                }

            } else if (tableName === "lnk") {
                if(row_clicked.classList.contains(cls_selected)) {
                    row_clicked.classList.remove(cls_selected, cls_hover);
                } else {
                    row_clicked.classList.add(cls_selected);
                   // remove clas from all other rows in theis table
                    for (let i = 0, row; row = table_body_clicked.rows[i]; i++) {
                        if(row === row_clicked){
                            row.classList.add(cls_selected);
                        } else {
                            row.classList.remove(cls_selected);
                        }
                    }
                    // unlink row_clicked  with delay of 250ms (to show selected Tsa and Excel row)
                    setTimeout(function () {
                        unlinkColumns(tableBase, tableName, row_clicked.id, row_clicked_key);
                        }, 250);
       }}}
    };  // handle_EAL_row_clicked

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                 ExcelFile_Read
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  Get_Workbook  ====================================
    function Get_Workbook(sel_file) {
        //* download the data using jQuery.post( url [, data ] [, success ] [, dataType ] ) PR2017-10-29 uit: https://api.jquery.com/jquery.post/
       if(!!sel_file){
            console.log("======  Get_Workbook  =====" + sel_file.name );
            console.log("stored_worksheetname: " + stored_worksheetname );

            var reader = new FileReader();
            var rABS = false; // false: readAsArrayBuffer,  true: readAsBinaryString
            if (rABS) {reader.readAsBinaryString(sel_file);} else {reader.readAsArrayBuffer(sel_file);}
           // PR2017-11-08 debug: reader.onload didn't work when reader.readAsBinaryString was placed after reader.onload

            // PR2018-12-09 debug: leave functions that depend on reading file within onload.
            // This way code executing stops till loading has finished.
            // Otherwise use Promise. See: https://javascript.info/promise-basics
            reader.onload = function(event) {
                var data = event.target.result;

                if(!rABS) { data = new Uint8Array(data);}
                switch (sel_file.type) {
                    case file_types.xls:
                        workbook = XLS.read(data, {type: rABS ? "binary" : "array"});
                        break;
                    default:
                        workbook = XLSX.read(data, {type: rABS ? "binary" : "array"});
                }

//--------- make list of worksheets in workbook
                if (!!workbook){
    // reset el_worksheet_list.options
                    el_worksheet_list.options.length = 0;
    // give message when workbook has no worksheets, reset selected_worksheetname
                    if(workbook.SheetNames.length === 0) {
                        selected_worksheetname = "";
                        // TODO translate
                        //para.textContent = "There are no worksheets." ;
                        para.textContent = get_attr_from_el(el_data, "data-txt_no_worksheets");
                        div_info.appendChild(para);
                    } else {
    // fill el_worksheet_list.options with sheets that are not empty
                        for (let x=0; x<workbook.SheetNames.length; ++x){
                            const sheetname = workbook.SheetNames[x];
    // if workbook.SheetNames[x] has range: add to el_worksheet_list
                            if (SheetHasRange(workbook.Sheets[sheetname])) {
                                let option = document.createElement("option");
                                option.value = sheetname;
                                option.innerHTML = sheetname;
    // make selected if name equals stored_worksheetname
                                if (!!stored_worksheetname) { // if x = '' then !!x evaluates to false.
                                    if(sheetname.toLowerCase() === stored_worksheetname.toLowerCase() ){
                                        option.selected = true;
                                }}
                                el_worksheet_list.appendChild(option);
                            }
                        } //for (let x=0;

//---------  give message when no data in worksheetse
                        if (!el_worksheet_list.options.length){
                            // TODO translate
                            //para.textContent = "There are no worksheets with data." ;
                            para.textContent = get_attr_from_el(el_data, "data-txt_no_worksheets_with_data");
                            div_info.appendChild(para);
                        } else {
//---------  if only one sheet exists: makke selected = True
                            if (el_worksheet_list.options.length === 1){
                                el_worksheet_list.options[0].selected = true;
                                selected_worksheetname = el_worksheet_list.options[0].value;
                            }
                        } //if (!el_worksheet_list.options.length){

//---------  get selected worksheet, if any
                        if(!!selected_worksheetname){
                            worksheet = workbook.Sheets[selected_worksheetname];
                            if(!!worksheet){
//---------  get Column and Rownumber of upper left cell and lower right cell of SheetRange
                                worksheet_range = GetSheetRange (worksheet);
                                if (!!worksheet_range) {
    //--------- set checkbox_noheader checked
                                    checkbox_noheader.checked = stored_no_header;
        //--------- fill worksheet_data with data from worksheet
                                    worksheet_data = FillWorksheetData(worksheet, worksheet_range, stored_no_header);
        //--------- fill table excel_columns
                                    Fill_Excel_Items();
                                    CreateMapTableWrap("col");

        //--------- fill DataTable
                                    FillDataTable(worksheet_range);
                                    UpdateDatatableHeader();

                                    // upload new settings tsaCaption
                                    UploadSettings ();
                                }
                            }
                        }
                    }
                }
            }; // reader.onload = function(event) {
        }; // if(!!sel_file){
    }  // function Get_Workbook(sel_file))

//=========  fill worksheet_data  ========================================================================
    function FillWorksheetData(work_sheet, sheet_range, no_header) {
    // fills the list 'worksheet_data' with data from 'worksheet'
        let sheet_data = [];
        let row = sheet_range.StartRowNumber;
        // skip first row when first row is header row
        if (!no_header) {++row;};
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
    }

//=========  Fill_Excel_Items  ========================================================================
    function Fill_Excel_Items() {
console.log("=========  Fill_Excel_Items ========= ");

        let colindex;
        let itemlist =[];

        excel_columns = [];

//======= create array 'excel_columns' =======

    // create array 'excel_columns' with Excel column names, replaces spaces, ", ', /, \ and . with _
        if(!!worksheet && !!worksheet_range) {
// get headers if Not SelectedSheetHasNoHeader: from first row, otherwise: F01 etc ");
            let row_number = worksheet_range.StartRowNumber;
            for (let col_number=worksheet_range.StartColNumber, idx = 0, colName = ""; col_number<=worksheet_range.EndColNumber; ++col_number){
                if (stored_no_header){
                    const index = "00" + col_number;
                    colName = "F" + index.slice(-2);
                } else {
                    const cellName = GetCellName (col_number,row_number);
                    const excValue = GetExcelValue(worksheet, cellName,"w");
                    colName = replaceChar(excValue);
                }
                excel_columns.push ({index: idx, excKey: colName});
                ++idx;
        }}


// =======  Map array 'excel_columns' with 'stored_coldefs' =======
    // function loops through stored_coldefs and excel_columns and add links and caption in these arrays

    // stored_coldefs: [ {tsaKey: "idnumber", caption: "ID nummer", excKey: "ID"}, 1: ...]
    // excel_columns: [ {index: 10, excKey: "ID", tsaKey: "idnumber", tsaCaption: "ID nummer"}} ]

    // loop through array stored_coldefs

        if(!!stored_coldefs) {
            for (let i = 0, len = stored_coldefs.length; i < len; i++) {
                let stored_row = stored_coldefs[i];
//console.log("stored_row", stored_row)
                // stored_row = {tsaKey: "orderdatelast", caption: "Einddatum opdracht"}
                let is_linked = false;
                if (!!stored_row.tsaKey && !!stored_row.excKey){
        //check if excKey also exists in excel_columns
                    let excel_row_byKey = get_arrayRow_by_keyValue (excel_columns, "excKey", stored_row.excKey);
        //if excKey is found in excel_columns: add tsaKey and tsaCaption to excel_row
                    if (!!excel_row_byKey){
                        excel_row_byKey.tsaKey = stored_row.tsaKey;
                        excel_row_byKey.tsaCaption = stored_row.caption;
                        is_linked = true;
                    } else {
        //if excKey is not found in excel_columns remove excKey from stored_row
                        delete stored_row.excKey;
                }}
        // if column not linked, check if TsaCaption and Excel name are the same, if so: link anyway
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
    }  // excel_columns

//=========  FillDataTable  ========================================================================
    function FillDataTable(sheet_range) {
console.log("=========  function FillDataTable =========");

//--------- delete existing rows
        $("#id_thead, #id_tbody").html("");

        if(!!worksheet_data && !!excel_columns){
            // create a <tblHead> element
            let tblHead = document.getElementById('id_thead');
            let tblBody = document.getElementById('id_tbody');

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
            }; //for (let j = 0; j < 2; j++)

//--------- insert DataSet rows
            //var EndRowIndex = 9;
            var LastRowIndex = sheet_range.RowCount -1;
            // worksheet_data has no header row, start allways at 0
            if (!stored_no_header) { --LastRowIndex;}
            //if (EndRow-1 < EndRowIndex) { EndRowIndex = EndRow-1;};
            for (let i = 0; i <= LastRowIndex; i++) {
                let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

                if (i%2 === 0) {
                    class_background = cls_cell_unchanged_even;
                } else {
                    class_background = cls_cell_unchanged_odd;
                }
                tblRow.classList.add(class_background);

                for (let j = 0 ; j < sheet_range.ColCount; j++) {
//console.log("worksheet_data[" + i + "][" + j + "]: <" + worksheet_data[i][j]) + ">";
                    let cell = tblRow.insertCell(-1); //index -1 results in that the new cell will be inserted at the last position.
                    if(!!worksheet_data[i][j]){
                        cell.innerHTML = worksheet_data[i][j];
                    };
                } //for (let j = 0; j < 2; j++)
            } //for (let i = 0; i < 2; i++)
            // sets the border attribute of tbl to 2;
            //table.setAttribute("border", "2");
        }; // if(!!worksheet_data && !!excel_columns){
    };//function DataTabel_Set() {

//=========  FillDataTableAfterUpload  ==============================
    function FillDataTableAfterUpload(response, sheet_range) {
console.log("=========  function FillDataTableAfterUpload =========");

//--------- delete existing rows
       // $("#id_thead, #id_tbody").html("");

        let tblBody =$("#id_tbody");
        tblBody.html("");

        if(!!worksheet_data && !!excel_columns){
            // create a <tblHead> element
            //let tblHead = document.getElementById('id_thead');
            //let tblBody = document.getElementById('id_tbody');

//--------- insert tblHead row of datatable
            //let tblHeadRow = tblHead.insertRow();

            //PR2017-11-21 debug: error when StartColNumber > 1, j must start at 0
            //var EndIndexPlusOne = (sheet_range.EndColNumber) - (sheet_range.StartColNumber -1)

            //index j goes from 0 to ColCount-1, excel_columns index starts at 0, last index is ColCount-1
            //for (let j = 0 ; j <sheet_range.ColCount; j++) {
            //    let cell = tblHeadRow.insertCell(-1);
            //    let excKey = excel_columns[j].excKey;
            //    cell.innerHTML = excKey;
            //    cell.setAttribute("id", "idTblCol_" + excKey);
            //}; //for (let j = 0; j < 2; j++)

//--------- iterate through response rows
            //var EndRowIndex = 9;
            var LastRowIndex = sheet_range.RowCount -1;
            // worksheet_data has no header row, start allways at 0
            if (!stored_no_header) { --LastRowIndex;}
            //if (EndRow-1 < EndRowIndex) { EndRowIndex = EndRow-1;};
            for (let i = 0, len = response.length; i <= len; i++) {
                let datarow = response[i];

//console.log("datarow: ", i , datarow );
//e_idnumber: "ID number already exists."
//e_lastname: "Student name already exists."
//o_firstname: "Arlienne Marie Nedelie"
//o_fullname: "Arlienne Marie Nedelie Frans"
//o_idnumber: "1996011503"
//o_lastname: "Frans"

// if s_idnumber is not present, the record is not saved
                let s_idnumber = get_dict_value_by_key (datarow, "s_idnumber")
                let record_is_saved = !!s_idnumber

//--------- iterate through columns of response row

// ---  add <tr>
                let id_datarow = "id_datarow_" + i.toString()
                let class_background;
                if (record_is_saved){
                    if (i%2 === 0) {
                        class_background = cls_cell_saved_even;
                    } else {
                        class_background = cls_cell_saved_odd;
                    }
                } else {
                    if (i%2 === 0) {
                        class_background = cls_cell_unchanged_even;
                    } else {
                        class_background = cls_cell_unchanged_odd;
                    }
                }
//console.log("class_background", class_background)
                $("<tr>").appendTo(tblBody)
                    .attr({"id": id_datarow})
                    .addClass(class_background);
                let tblRow = $("#" + id_datarow);
                for (let j = 0, len = excel_columns.length ; j < len; j++) {

//========= Create td
                    let id_datacell =  "id_datacell_" + i.toString() + "_" + + j.toString()
                    $("<td>").appendTo(tblRow)
                             .attr({"id": id_datacell});
                    let tblCell = $("#" + id_datacell);

                    let key = get_dict_value_by_key (excel_columns[j], "tsaKey");
// ---  skip if column not linked
                    if (!!key) {

                        let o_value, e_value, s_value;
                        o_value = get_dict_value_by_key (datarow, "o_" + key);
                        e_value = get_dict_value_by_key (datarow, "e_" + key);
                        s_value = get_dict_value_by_key (datarow, "s_" + key);


                        if(!!o_value){
                            tblCell.html(o_value);
                        }
                        // add tooltip, set background color pink

                        if (!!e_value){
                            if (i%2 === 0) {class_background = "cell_error_even"; } else { class_background = "cell_error_odd"; }
                            tblCell.html(o_value);
                            tblCell.attr({"data-toggle": "tooltip", "title": e_value})
                                    .addClass(class_background);
                        } else {
                            tblCell.html(s_value);
                        }
                        tblCell.addClass(class_background);






                    }

//console.log("worksheet_data[" + i + "][" + j + "]: <" + worksheet_data[i][j]) + ">";







                } //for (let j = 0; j < 2; j++)
            } //for (let i = 0; i < 2; i++)
        }; // if(!!worksheet_data && !!excel_columns){
    };//function FillDataTableAfterUpload() {

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
// console.log("ColNumber: " + ColNumber + " RowNumber: " + RowNumber);
        var col_name = "";
        if (ColNumber>0 && RowNumber>0){

            for (let exp=2; exp>=0; --exp){
                const divisor = Math.pow(26, exp);
                let dividend = ColNumber;
                // subtract 1 (otherwise 26=AA instead of Z, except for last character (exp=0)
                if (exp > 0 ){--dividend;};
// console.log("exp: " + exp + ", dividend: " + dividend +", divisor: " + divisor);
                const mod = Math.floor((dividend)/divisor);
                const frac = ColNumber - mod * divisor;
// console.log("mod: " + mod + ", frac: " + frac);
                if (mod>0){
                    col_name += String.fromCharCode(mod + 64);
                };// if (mod>0){
                ColNumber = frac;
            }; //for (let exp=2; exp>=0; --exp)
            col_name = col_name + RowNumber;
// console.log("col_name " + col_name);
        }; //if (ColNumber>0 && RowNumber>0)
        return col_name;
    }; //function GetCellName (ColIndex, RowIndex )

//========= GetExcelValue  ====================================
    // PR2017-11-04 from: https://stackoverflow.com/questions/2693021/how-to-count-javascript-array-objects
    function GetExcelValue(Sheet, CellName, ValType) {
// console.log("--------------GetExcelValue");
// console.log("GetExcelValue CellName: " + CellName + "ValType: " + ValType);
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

//========= CreateMapTableWrap(tableBase))  ====================================
    function CreateMapTableWrap(tableBase) {
console.log("==== CreateMapTableWrap  =========> ", tableBase);

        let header1, header2, headExc, headTsa, headLnk, tsaKey;
        let stored_items;
        let excel_items;

        // remove table
        $("#id_basediv_" + tableBase).html("");

        if (tableBase === "col"){
            header1 = captions.link_columns;
            header2 = captions.click_items;
            headExc = captions.excel_columns;
            headTsa = captions.tsa_columns;
            headLnk =captions.linked_columns ;
             if (!!stored_coldefs){
                CreateMapTableSub(tableBase, header1, header2, headExc, headTsa, headLnk);
                CreateMapTableRows(tableBase, stored_coldefs, excel_columns);
            }
        }

    }

//========= CreateMapTableSub  ====================================
    function CreateMapTableSub(tableBase, header1, header2, headExc, headTsa, headLnk ) {
        //console.log("==== CreateMapTableSub  =========>>>", tableBase, header1, header2, headExc, headTsa, headLnk);
        let base_div = $("#id_basediv_" + tableBase);  // BaseDivID =  "col"
        // delete existing rows of tblColExcel, tblColTsa, tblColLinked
        base_div.html("");

        //append column header to base_div
        $("<div>").appendTo(base_div)
                .addClass(cls_columns_header)
                //header1 = "Link sectors"
                //header2 = "Click to link or unlink sector"
                .html("<p><b>" + header1 + "</b></p><p>" + header2 + "</p>");

        // append flex div for table Excel and Tsa
        $("<div>").appendTo(base_div)
            .attr({id: "id_ea_flex_" + tableBase})
            .addClass(cls_ea_flex);

        // append div for table Tsa
            $("<div>").appendTo("#id_ea_flex_" + tableBase)
                .attr({id: "id_tsa_div_" + tableBase});
                $("<table>").appendTo("#id_tsa_div_" + tableBase)
                        .attr({id: "id_tsa_table_" + tableBase})
                        .addClass(cls_grid_colExcel)
                        .on("click", handle_EAL_row_clicked);
                    $("<thead>").appendTo("#id_tsa_table_" + tableBase)
                            .html("<tr><td>" + headTsa + "</td></tr>"); // headTsa: "TSA columns"
                    $("<tbody>").appendTo("#id_tsa_table_" + tableBase)
                            .attr({id: "id_tsa_tbody_" + tableBase});


        // append div for table Excel
            $("<div>").appendTo("#id_ea_flex_" + tableBase)
                .attr({id: "id_exc_div_" + tableBase});
                $("<table>").appendTo("#id_exc_div_" + tableBase)
                        .attr({id: "id_exc_table_" + tableBase})
                        .addClass(cls_grid_colExcel)
                        .on("click", handle_EAL_row_clicked);

                    $("<thead>").appendTo("#id_exc_table_" + tableBase)
                            .html("<tr><td>" + headExc + "</td></tr>"); // headExc: "Excel sectors"
                    $("<tbody>").appendTo("#id_exc_table_" + tableBase)
                            .attr({id: "id_exc_tbody_" + tableBase});


        // append flex div for table Linked
        $("<div>").appendTo(base_div)
                .attr({id: "id_li_flex_" + tableBase})
                .addClass(cls_li_flex);
            $("<div>").appendTo("#id_li_flex_" + tableBase)
                    .attr({id: "id_lnk_div_" + tableBase});
                $("<table>").appendTo("#id_lnk_div_" + tableBase)
                        .attr({id: "id_lnk_table_" + tableBase})
                        .addClass(cls_grid_colLinked)
                        .on("click", handle_EAL_row_clicked);
                    $("<thead>").appendTo("#id_lnk_table_" + tableBase)
                            .attr({id: "id_sct_th_lnk_" + tableBase})
                            .html("<tr><td colspan=2>" + headLnk + "</td></tr>"); // headLnk: "Linked sectors"
                    $("<tbody>").appendTo("#id_lnk_table_" + tableBase)
                            .attr({id: "id_lnk_tbody_" + tableBase});

         }; //function CreateMapTableSub()
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//========= CreateMapTableRows  ====================================
    function CreateMapTableRows(tableBase, stored_items, excel_items,
                    JustLinkedTsaId, JustUnlinkedTsaId, JustUnlinkedExcId) {

    //console.log("==== CreateMapTableRows  =========>> ", tableBase);
        //const cae_hl = "c_colTsaExcel_highlighted";
        //const cli_hi = "c_colLinked_highlighted";

        const Xid_exc_tbody = "#id_exc_tbody_" + tableBase;
        const Xid_tsa_tbody = "#id_tsa_tbody_" + tableBase;
        const Xid_lnk_tbody = "#id_lnk_tbody_" + tableBase;

// console.log("stored_items", stored_items, typeof stored_items);
// console.log("excel_items", excel_items, typeof excel_items);

        // JustUnlinkedTsaId = id_tsa_tr_sct_1
        // JustUnlinkedExcId = id_exc_tr_sct_2
        // delete existing rows of tblColExcel, tblColTsa, tblColLinked
        $(Xid_exc_tbody).html("");
        $(Xid_tsa_tbody).html("");
        $(Xid_lnk_tbody).html("");

    //======== loop through array stored_items ========
        for (let i = 0 ; i <stored_items.length; i++) {
            // row = {tsaKey: "30", caption: "tech", excKey: "cm"}
            let row = stored_items[i];
            const idTsaRow = "id_tsa_tr_" + tableBase + "_" + i.toString();
            const XidTsaRow = "#" + idTsaRow;

        //if excKey exists: append row to table ColLinked
            if (!!row.excKey){
                $("<tr>").appendTo(Xid_lnk_tbody)
                    .attr({"id": idTsaRow, "key": row.tsaKey})
                    .addClass(cls_colLinked_tr)
                    .mouseenter(function(){$(XidTsaRow).addClass(cls_hover);})
                    .mouseleave(function(){$(XidTsaRow).removeClass(cls_hover);})
        // append cells to row Linked
                    .append("<td>" + row.caption + "</td>")
                    .append("<td>" + row.excKey + "</td>");

        //if new appended row: highlight row for 1 second
                if (!!JustLinkedTsaId && !!idTsaRow && JustLinkedTsaId === idTsaRow) {
                   $(XidTsaRow).addClass(cls_hover);
                   setTimeout(function (){$(XidTsaRow).removeClass(cls_hover);}, 1000);
                }
            } else {

        // append row to table Tsa if excKey does not exist in stored_items
                $("<tr>").appendTo(Xid_tsa_tbody)
                    .attr({"id": idTsaRow, "key": row.tsaKey})
                    .addClass(cls_colExcelTsa_tr)
                    .mouseenter(function(){$(XidTsaRow).addClass(cls_hover);})
                    .mouseleave(function(){$(XidTsaRow).removeClass(cls_hover);})
        // append cell to row ExcKey
                    .append("<td>" + row.caption + "</td>");
        // if new unlinked row: highlight row for 1 second
                if (!!JustUnlinkedTsaId && !!idTsaRow && JustUnlinkedTsaId === idTsaRow) {
                    $(XidTsaRow).addClass(cls_hover);
                    setTimeout(function () {$(XidTsaRow).removeClass(cls_hover);}, 1000);
            }}};

    //======== loop through array excel_items ========
        // excel_sectors [{excKey: "cm", {tsaKey: "c&m"},}, {excKey: "em"}, {excKey: "ng"}, {excKey: "nt"}]
        for (let i = 0 ; i < excel_items.length; i++) {
            // only rows that are not linked are added to tblColExcel
            //  {excKey: "idSctExc_0", caption: "china"}
            let row = excel_items[i];
            const idExcRow = "id_exc_tr_" + tableBase + "_" + i.toString();
            const XidExcRow = "#" + idExcRow;

        // append row to table Excel if tsaKey: does not exist in excel_items
            if (!row.tsaKey){
                $("<tr>").appendTo(Xid_exc_tbody)
                    .attr({"id": idExcRow})
                    .attr({"id": idExcRow, "key": row.excKey})
                    .addClass(cls_colExcelTsa_tr)
                    .mouseenter(function(){$(XidExcRow).addClass(cls_hover);})
                    .mouseleave(function(){$(XidExcRow).removeClass(cls_hover);})
        // append cell to row ExcKey
                    .append("<td>" + row.excKey + "</td>");
        // if new unlinked row: highlight row ColExc
                if (!!JustUnlinkedExcId && !!idExcRow && JustUnlinkedExcId === idExcRow) {
                    $(XidExcRow).addClass(cls_hover);
                    setTimeout(function () {$(XidExcRow).removeClass(cls_hover);}, 1000);
        }}};
     }; //function CreateMapTableRows()

//========= function UdateDatatableHeader  ====================================================
    function UpdateDatatableHeader() {
//----- set tsaCaption in linked header colomn of datatable
//console.log("---------  function UpdateDatatableHeader ---------");
//----- loop through array excel_columns from row index = 0
        for (let j = 0 ; j <excel_columns.length; j++) {
            // only rows that are not linked are added to tblColExcel
            let ExcCol = excel_columns[j].excKey;
            let TsaCaption = excel_columns[j].tsaCaption;

            let tblColHead = document.getElementById("idTblCol_" + ExcCol);
            if (!!TsaCaption){
                tblColHead.innerHTML = TsaCaption;
                tblColHead.classList.add(cls_selected);
            } else {
                tblColHead.innerHTML = ExcCol;
                tblColHead.classList.remove(cls_selected);
            }
        }
   } // function UpdateDatatableHeader


//========= linkColumns  ====================================================
    function linkColumns(tableBase, tableName, row_clicked_id, row_other_id, row_clicked_key, row_other_key) {
//console.log("==========  linkColumns ==========>> ", tableBase, tableName, row_clicked_key, row_other_key);
// function adds 'excCol' to stored_coldefs and 'tsaCaption' to excel_columns

//console.log("tableBase ", tableBase, "tableName: ", tableName);
//console.log("row_clicked_id: ", row_clicked_id, "row_other_id ", row_other_id );
//console.log("row_clicked_key ", row_clicked_key, "row_other_key ", row_other_key );

        let stored_items, excel_items;
        if (tableBase === "col") {
            stored_items = stored_coldefs;
            excel_items = excel_columns;
        }

        let stored_row_id, stored_row_tsaKey,excel_row_excKey;
        if (tableName ===  "tsa") {
            stored_row_id = row_clicked_id;
            stored_row_tsaKey = row_clicked_key;
            excel_row_excKey = row_other_key;
        } else if (tableName ===  "exc") {
            stored_row_id = row_other_id;
            stored_row_tsaKey = row_other_key;
            excel_row_excKey = row_clicked_key;
        }

        let stored_row = get_arrayRow_by_keyValue (stored_items, "tsaKey", stored_row_tsaKey);
        // stored_row = {tsaKey: "ordername", caption: "Opdracht"}
        let excel_row = get_arrayRow_by_keyValue (excel_items, "excKey", excel_row_excKey);
        // excel_row = {caption: "Opdracht", excKey: "sector_sequence", tsaKey: "ordername"}
//console.log("stored_row: ", stored_row, "excel_row: ", excel_row );

        if(!!stored_row && !!excel_row){
            if(!!excel_row.excKey){
                stored_row["excKey"] = excel_row.excKey;};
            if(!!stored_row.tsaKey){
                excel_row["tsaKey"] = stored_row.tsaKey;};
            if(!!stored_row.caption){
                excel_row["tsaCaption"] = stored_row.caption;};
        }
// stored_row = {tsaKey: "ordername", caption: "Opdracht", excKey: "sector_name"}
// excel_row = {index: 0, excKey: "sector_name", tsaKey: "ordername", tsaCaption: "Opdracht"}
//console.log("stored_row: ", stored_row, "excel_row: ", excel_row );

        // save changes in array stored_coldefs, excel_columns etc
        if (tableBase === "col") {
            stored_coldefs = stored_items;
            excel_columns = excel_items;
        }

        // JustLinkedTsaId = stored_row_id;
        CreateMapTableRows(tableBase, stored_items, excel_items, stored_row_id);

        if (tableBase === "col") {
            UpdateDatatableHeader();
        }
    // upload new settings
       UploadSettings();
    };

//========= unlinkColumns =======================================================
    function unlinkColumns(tableBase, tableName, row_clicked_id, row_clicked_key) {
        // function deletes attribute 'excKey' from stored_items
        // and deletes attributes 'tsaKey' and 'tsaCaption' from ExcelDef
        // if type= 'col': UpdateDatatableHeader
        // calls UploadSettings and
//console.log("====== unlinkColumns =======================");

// function removes 'excKey' from stored_items and 'tsaKey' from excel_items

        let stored_items, excel_items;
        if (tableBase === "col") {
            stored_items = stored_coldefs;
            excel_items = excel_columns;
        }

        const JustUnlinkedTsaId = row_clicked_id;

        // in unlink: row_clicked_key = tsaKey
        // stored_row = {tsaKey: "gender", caption: "Geslacht", excKey: "MV"}
        let stored_row, excel_row, JustUnlinkedExcId;
        stored_row = get_arrayRow_by_keyValue (stored_items, "tsaKey", row_clicked_key);
        // excel_row =  {index: 8, excKey: "geboorte_land", tsaKey: "birthcountry", tsaCaption: "Geboorteland"}
        if (!!stored_row) {
            if (!!stored_row.excKey) {
        // look up excKey in excel_items
                excel_row= get_arrayRow_by_keyValue (excel_items, "excKey", stored_row.excKey)
        // delete excKey from stored_row
                delete stored_row.excKey;
                if (!!excel_row) {
                    JustUnlinkedExcId = "id_exc_tr_" + tableBase + "_" + excel_row.index;
        // delete tsaKey and tsaCaption from excel_row]
                    delete excel_row.tsaKey;
                    delete excel_row.tsaCaption;
                }
            }  // if (!!stored_row.excKey)
        }  // if (!!stored_row)

        CreateMapTableRows(tableBase, stored_items, excel_items,
                            "", JustUnlinkedTsaId, JustUnlinkedExcId);

        if (tableBase === "col") {
            stored_columns = stored_items;
            UpdateDatatableHeader();
        }

    // upload new settings
       UploadSettings();

    }  // function unlinkColumns(idTsaCol)


//========= UPLOAD SETTING COLUMNS =====================================
    function UploadSettings () {
//console.log ("==========  UploadSettings");
        if(!!stored_coldefs) {
            // stored_coldefs is an array and has a .length property
            if(stored_coldefs.length > 0){
                // settingsValue is an associative array
                let settingsValue = {};
                if (!!selected_worksheetname){settingsValue["worksheetname"] = selected_worksheetname}

                // get value of code_calc
                let el_select_code_calc = document.getElementById("id_select_code_calc");
                if (!!el_select_code_calc.value){settingsValue["codecalc"] = el_select_code_calc.value}

                settingsValue["no_header"] = stored_no_header;

                let coldefs = {};
                if (!!stored_coldefs){
                    for (let i = 0 ; i <stored_coldefs.length; i++) {
                        if (!!stored_coldefs[i].excKey){
                            coldefs[stored_coldefs[i].tsaKey] = stored_coldefs[i].excKey;
                }}};
                if (!!coldefs){settingsValue["coldefs"] = coldefs}
console.log("settingsValue", settingsValue)
                // parameters = {setting: "{"worksheetname":"vakquery","no_header":false,
                //                         "coldefs:{"companyname":"code","ordername":"sequence"}}"}
                const parameters = {"setting": JSON.stringify (settingsValue)};

                const url_str = $("#id_data").data("employee_uploadsetting_url");

                response = "";
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
console.log("-------------- response: success  --------------");
                    },
                    error: function (xhr, msg) {
console.log(msg + '\n' + xhr.responseText);
                    }
                });  // $.ajax
            }; //if(stored_coldefs > 0)
        }  //  if(!!stored_coldefs)
    }; // function (UploadSettings)


//========= UPLOAD DATA =====================================
    $("#btn_import").on("click", function () {
console.log ("==========  UPLOAD DATA ==========");

        const url_str = $("#id_data").data("employee_uploaddata_url");
//--------- delete existing rows
        $("#id_tbody").html("");

//--------- show loading gif
        ShowLoadingGif(true);

        let rowLength = 0, colLength = 0;
        if(!!worksheet_data){rowLength = worksheet_data.length;};
        if(!!stored_coldefs){colLength = stored_coldefs.length;};
        if(rowLength > 0 && colLength > 0){

// ---  loop through all rows of worksheet_data
            let employees = [];
// row <5 is for testing
            for (let row = 0 ; row < rowLength; row++) {
                let DataRow = worksheet_data[row];

//------ loop through excel_columns
                let item = {};
                for (let idx = 0, len = excel_columns.length ; idx < len; idx++) {
                    if (!!excel_columns[idx].tsaKey){
                        let tsa_key = excel_columns[idx].tsaKey;
                        if (!!DataRow[idx]){
                            item[tsa_key] = DataRow[idx];
                        }
                    }
                }; //for (let col = 1 ; col <colLength; col++)
                employees.push(item);
            }  // for (let row = 0 ; row < 5; row++)

console.log("employees ==>");
console.log( employees);
            let parameters = {"employees": JSON.stringify (employees)};

            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
console.log("========== response Upload employees ==>", typeof response,  response);

//--------- hide loading gif
                    ShowLoadingGif(false);

                    FillDataTableAfterUpload(response, worksheet_range);
                },
                error: function (xhr, msg) {
//--------- hide loading gif
                    ShowLoadingGif(false);

                    console.log(msg + '\n' + xhr.responseText);
                }
            });
        }; //if(rowLength > 0 && colLength > 0)
    }); //$("#btn_import").on("click", function ()
//========= END UPLOAD =====================================

    function get_tsakey_from_storeditems(stored_items, excKey) {
    //--------- lookup tsaKey in stored_items PR2019-02-22
    //stored_sectors:  {tsaKey: "32", caption: "c&m", excKey: "cm"}
        let tsa_key;
        if (!!stored_items && !!excKey){
            for (let i = 0, len = stored_items.length ; i < len; i++) {
                if (!!stored_items[i].excKey){
                    if (stored_items[i].excKey.toLowerCase()  === excKey.toLowerCase() ){
                        if (!!stored_items[i].tsaKey){
                            tsa_key = stored_items[i].tsaKey;
                            break;
        }}}}};
        return tsa_key
    }

    function ShowLoadingGif(show) {
    //--------- show / hide loading gif PR2019-02-19

        let el_loader = document.getElementById("id_loader");
        let datatable = document.getElementById("id_table");

        if (show){
            el_loader.classList.remove(cls_display_hide);
            el_loader.classList.add(cls_display_show);
            datatable.classList.remove(cls_display_show);
            datatable.classList.add(cls_display_hide);
        } else {
            el_loader.classList.remove(cls_display_show);
            el_loader.classList.add(cls_display_hide);
            datatable.classList.remove(cls_display_hide);
            datatable.classList.add(cls_display_show);
        }
    }
    }); //$(document).ready(function() {
