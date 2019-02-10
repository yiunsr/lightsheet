
function loadingModal(status, title, body){
    var __title_default = "Loading ...";
    var __body_default = "";
    var percent = 0;
    if(title){
        $("#loadingModalTitle").val(title);
    }
    

    if(status == "start"){
        percent = 0;
        $("#loadingModal").modal("show");
        
    }
    else if(status == "end"){
        percent = 100;
        $("#loadingModalTitle").text(__title_default);
        $("#loadingModalBody").text(__body_default);

        // $("#loadingModal").modal("hide");
        setTimeout(function(){
            $("#loadingModal").modal("hide");
          }, 500);
    }
    else{
        percent = status;
        $("#loadingModal").modal("show");
    }

    $("#loadingModalPercent").width(percent + "%");
    if(body){
        $("#loadingModalBody").val(body);
    }
    else{
        $("#loadingModalPercent").text(percent + "%");
    }
    
}